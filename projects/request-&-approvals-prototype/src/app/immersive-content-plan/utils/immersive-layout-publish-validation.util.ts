import type { FieldDescriptor, ImmersivePlanAudience, ModuleArrayDescriptor } from '../models/immersive-layout-descriptor.model';
import { getDescriptor } from '../models/immersive-layout-descriptor.registry';
import type { ImmersiveLayoutDocument, ImmersiveLayoutModule, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import type { PlanviewLayout } from '../models/planview-layout-envelope.model';
import { deriveDocumentFamily, isPublishableDocumentFamily } from './immersive-layout-document-family.util';
import { collectModuleFields, isFieldHiddenByValue, tokenOf, translationOf, type CollectedField } from './immersive-layout-field.util';
import { collectEditableModules } from './immersive-layout-general-settings.util';
import { collectDocumentTokenOwners, isTokenTranslated } from './immersive-layout-locale-gaps.util';
import { isValidLocaleKey, normalizeDocumentLocales } from './immersive-layout-locale.util';
import { normalizePositiveInteger } from './immersive-layout-number.util';
import { effectiveModuleItems, readPropValue } from './immersive-layout-prop-path.util';
import { isHttpsUrl } from './immersive-layout-url.util';

export type PublishValidationCode =
  | 'document_family'
  | 'invalid_enum'
  | 'invalid_locale_key'
  | 'invalid_url'
  | 'media_broken'
  | 'media_checking'
  | 'missing_translation'
  | 'missing_value'
  | 'request_failed'
  | 'server_rejected';

// Full i18n keys, not suffixes: an error travels to the actions bar and the module badge, neither
// of which shares the field-level `planEdition.immersiveContentPlan` prefix convention.
export const MESSAGE_KEYS = {
  document_family: 'planEdition.immersiveContentPlan.validation.documentFamily',
  invalid_enum: 'planEdition.immersiveContentPlan.validation.invalidEnum',
  invalid_locale_key: 'planEdition.immersiveContentPlan.validation.invalidLocaleKey',
  invalid_url: 'planEdition.immersiveContentPlan.validation.invalidUrl',
  // A url the browser cannot load is an invalid url to the publisher: same summary line.
  media_broken: 'planEdition.immersiveContentPlan.validation.invalidUrl',
  media_checking: 'planEdition.immersiveContentPlan.validation.mediaChecking',
  missing_translation: 'planEdition.immersiveContentPlan.validation.missingTranslation',
  missing_value: 'planEdition.immersiveContentPlan.validation.missingValue',
} as const;

type FieldValidationCode = 'invalid_enum' | 'invalid_url' | 'missing_value';

export interface PublishValidationError {
  code: PublishValidationCode;
  // Set when the backend rejects this error on every write, so the draft save is blocked as well.
  blocksDraft?: boolean;
  detail?: string;
  fieldPath?: string;
  locale?: string;
  message: string;
  messageKey?: string;
  moduleId?: string;
  token?: string;
}

export interface PublishValidationResult {
  errors: PublishValidationError[];
  valid: boolean;
}

export const EMPTY_PUBLISH_VALIDATION: PublishValidationResult = { errors: [], valid: true };

export type LayoutPersistStatus = PlanviewLayout['status'];

export interface NormalizedWorkingDocument {
  normalized: PlanviewLayout | null;
  validation: PublishValidationResult;
}

/**
 * Normalize once, validate the result, and hand back both.
 *
 * The document is normalized exactly as the payload it will become, so the module gap badge and
 * the publish gate judge the same bytes that go over the wire. Sharing one function with the test
 * mocks keeps every component spec asserting against the gates the store would really produce.
 */
export function derivePublishValidation(
  working: PlanviewLayout | null,
  baseLocale: string | null,
  audience: ImmersivePlanAudience | null,
): NormalizedWorkingDocument {
  if (working === null) {
    return { normalized: null, validation: EMPTY_PUBLISH_VALIDATION };
  }
  const normalized = normalizeDocumentLocales(working);
  return { normalized, validation: validateDocumentForPublish(normalized, baseLocale, audience) };
}

// The caller passes a document `derivePublishValidation` already normalized, so this is a status
// swap and nothing else. Normalizing here as well rewrote the locale keys a second time on every
// gate evaluation, and made the validated bytes only incidentally equal to the sent ones.
// An unset base locale is left out rather than sent as `null`: omitted keeps the stored one.
export function buildUpsertPayload(working: PlanviewLayout, status: LayoutPersistStatus): PlanviewLayout {
  const { base_locale: baseLocale, ...rest } = working;
  return { ...rest, ...(baseLocale == null ? {} : { base_locale: baseLocale }), status };
}

export function validateDocumentForPublish(
  document: ImmersiveLayoutDocument,
  baseLocale: string | null,
  audience: ImmersivePlanAudience | null,
): PublishValidationResult {
  const family = deriveDocumentFamily(document);
  if (!isPublishableDocumentFamily(family)) {
    return {
      errors: [
        {
          code: 'document_family',
          message: 'Only immersive layouts can be published from this editor.',
          messageKey: MESSAGE_KEYS.document_family,
        },
      ],
      valid: false,
    };
  }

  const errors: PublishValidationError[] = [
    ...collectLocaleKeyErrors(document),
    ...collectTranslationCompletenessErrors(document, audience),
    ...collectModuleFieldErrors(document, baseLocale),
  ];

  return { errors, valid: errors.length === 0 };
}

function collectLocaleKeyErrors(document: ImmersiveLayoutDocument): PublishValidationError[] {
  const invalidLocales = [...new Set([...document.available_languages, ...Object.keys(document.translations)])].filter(
    locale => !isValidLocaleKey(locale),
  );

  return invalidLocales.map(locale => ({
    code: 'invalid_locale_key',
    locale,
    message: `Locale key "${locale}" must use the xx_YY form.`,
    messageKey: MESSAGE_KEYS.invalid_locale_key,
  }));
}

function collectTranslationCompletenessErrors(
  document: ImmersiveLayoutDocument,
  audience: ImmersivePlanAudience | null,
): PublishValidationError[] {
  // One walk gives both the token list and the module each token belongs to, so a missing
  // translation lands on the panel that renders it without a second pass over every prop.
  const tokenOwners = [...collectDocumentTokenOwners(document, audience)];

  return document.available_languages.flatMap(locale =>
    tokenOwners.flatMap(([token, moduleId]) => {
      if (isTokenTranslated(document.translations, token, locale)) {
        return [];
      }
      return [
        {
          code: 'missing_translation' as const,
          locale,
          message: `Missing translation for "${token}" in ${locale}.`,
          messageKey: MESSAGE_KEYS.missing_translation,
          moduleId,
          token,
        },
      ];
    }),
  );
}

function collectModuleFieldErrors(document: ImmersiveLayoutDocument, baseLocale: string | null): PublishValidationError[] {
  return collectEditableModules(document).flatMap(module => {
    const descriptor = getDescriptor(module.type);
    if (descriptor === undefined) {
      return [];
    }

    const errors = [
      ...collectModuleFields(module, descriptor)
        .filter(collected => !isFieldHiddenByValue(collected.field, module.props))
        .flatMap(collected => collectFieldValueErrors(module, collected, document, baseLocale)),
      ...collectMinItemsErrors(module, descriptor.arrays ?? []),
    ];
    return descriptor.propsRequired === true
      ? errors.map(error => (error.code === 'missing_value' ? { ...error, blocksDraft: true } : error))
      : errors;
  });
}

// An array below its floor has no rows for the per-field walk to visit, so it is checked as a
// whole. Top-level groups only: no child group declares `minItems`.
function collectMinItemsErrors(module: ImmersiveLayoutModule, groups: readonly ModuleArrayDescriptor[]): PublishValidationError[] {
  return groups
    .filter(group => effectiveModuleItems(module, group.path).length < (group.minItems ?? 0))
    .map(group => ({
      code: 'missing_value',
      fieldPath: group.path,
      message: `At least ${group.minItems} item(s) required for ${module.id} · ${group.path}.`,
      messageKey: MESSAGE_KEYS.missing_value,
      moduleId: module.id,
    }));
}

// The per-field half of the contract, exported so the `required` semantics keep their own spec
// seam: `collectModuleFields` already walks array items, so array depth is covered for free.
export function collectFieldValueErrors(
  module: ImmersiveLayoutModule,
  collected: CollectedField,
  document: ImmersiveLayoutDocument,
  baseLocale: string | null,
): PublishValidationError[] {
  const raw = readPropValue(module.props, collected.path);

  return [
    ...collectUrlErrors(module, collected, raw),
    ...collectEnumErrors(module, collected, raw),
    ...collectRequiredValueErrors(module, collected, raw, document, baseLocale),
  ];
}

function collectUrlErrors(
  module: ImmersiveLayoutModule,
  collected: CollectedField,
  raw: ImmersiveLayoutValue | undefined,
): PublishValidationError[] {
  // An absent or cleared URL is only a problem when the field is required, which is
  // `collectRequiredValueErrors`' call. Anything else present must be https, media or link alike:
  // a link is shown to the shopper as-is. Absent has three shapes and all three must be let
  // through: the key missing, the editor clearing it to `''`, and `null` — the one the backend
  // sends, and the one the registry documents for the hero media item ("{src, type, alt, poster},
  // all nullable").
  if (collected.field.kind !== 'url' || raw === undefined || raw === null || raw === '') {
    return [];
  }
  return isHttpsUrl(raw)
    ? []
    : [fieldError('invalid_url', module, collected, `URL must start with https:// (${module.id} · ${collected.path}).`)];
}

function collectEnumErrors(
  module: ImmersiveLayoutModule,
  collected: CollectedField,
  raw: ImmersiveLayoutValue | undefined,
): PublishValidationError[] {
  const allowed = collected.field.enumValues ?? [];
  if (collected.field.kind !== 'enum' || collected.field.openEnum === true || allowed.length === 0) {
    return [];
  }
  const value = raw === undefined ? null : raw;
  return allowed.some(candidate => candidate === value)
    ? []
    : [fieldError('invalid_enum', module, collected, `Invalid value for ${module.id} · ${collected.path}.`)];
}

function collectRequiredValueErrors(
  module: ImmersiveLayoutModule,
  collected: CollectedField,
  raw: ImmersiveLayoutValue | undefined,
  document: ImmersiveLayoutDocument,
  baseLocale: string | null,
): PublishValidationError[] {
  if (collected.field.required !== true) {
    return [];
  }
  const baseLocaleText = collected.field.kind === 'token' ? resolveBaseLocaleText(document, raw, baseLocale) : null;
  return isRequiredValueMissing(collected.field, raw, baseLocaleText)
    ? [fieldError('missing_value', module, collected, `A value is required for ${module.id} · ${collected.path}.`)]
    : [];
}

function resolveBaseLocaleText(
  document: ImmersiveLayoutDocument,
  raw: ImmersiveLayoutValue | undefined,
  baseLocale: string | null,
): string | null {
  const token = tokenOf(raw);
  return token === null || baseLocale === null ? null : translationOf(document.translations, token, baseLocale);
}

/**
 * Requiredness per field kind. Evaluated only for `required: true` fields, so a non-required field
 * can never report `missing_value` — `omitWhenEmpty` clears a field to `undefined`, which counts
 * as missing on every kind.
 *
 * A token needs both halves: a `{{token}}` placeholder AND usable text in the base locale. Other
 * locales stay the job of `missing_translation`.
 */
export function isRequiredValueMissing(
  field: FieldDescriptor,
  raw: ImmersiveLayoutValue | undefined,
  baseLocaleText: string | null,
): boolean {
  switch (field.kind) {
    case 'boolean':
      return raw !== true && raw !== false;
    // `null` is a listed enum member on most fields, but it is never a value a required field may keep.
    case 'enum':
      return raw === null || raw === undefined;
    case 'number':
      return typeof raw !== 'number' || normalizePositiveInteger(raw) === null;
    case 'token':
      return tokenOf(raw) === null || baseLocaleText === null || baseLocaleText.trim() === '';
    case 'url':
      return typeof raw !== 'string' || raw === '';
    default:
      return typeof raw !== 'string' || raw.trim() === '';
  }
}

function fieldError(
  code: FieldValidationCode,
  module: ImmersiveLayoutModule,
  collected: CollectedField,
  message: string,
): PublishValidationError {
  return {
    code,
    fieldPath: collected.path,
    message,
    messageKey: MESSAGE_KEYS[code],
    moduleId: module.id,
  };
}
