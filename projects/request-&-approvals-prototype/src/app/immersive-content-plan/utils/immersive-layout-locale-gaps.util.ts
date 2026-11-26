import type { FieldDescriptor, ImmersivePlanAudience } from '../models/immersive-layout-descriptor.model';
import { getDescriptor, isHiddenModuleType } from '../models/immersive-layout-descriptor.registry';
import type {
  ImmersiveLayoutDocument,
  ImmersiveLayoutModule,
  ImmersiveLayoutTranslations,
} from '../models/immersive-layout-document.model';
import { extractTokens, isFieldHiddenByValue, isFieldHiddenForAudience } from './immersive-layout-field.util';
import { collectEditableModules } from './immersive-layout-general-settings.util';
import { readPropValue } from './immersive-layout-prop-path.util';

/**
 * Every unique token referenced anywhere in the document, mapped to the module that owns it.
 *
 * One walk answers both questions the validator asks — which tokens exist, and which panel a
 * missing translation belongs on — instead of two identical recursive passes over every prop of
 * every module. Insertion order is document order, and the first module to reference a shared
 * token keeps it, so `[...owners.keys()]` is the same list `extractDocumentTokens` returned.
 * A hidden module type is skipped, and so is a top-level prop hidden for the plan audience or by a
 * sibling prop value: the editor offers no way to fill their gaps. A channel variant owns its tokens under its editable key,
 * after every base module.
 */
export function collectDocumentTokenOwners(document: ImmersiveLayoutDocument, audience: ImmersivePlanAudience | null): Map<string, string> {
  const owners = new Map<string, string>();
  for (const module of collectEditableModules(document).filter(({ type }) => !isHiddenModuleType(type))) {
    const fields = getDescriptor(module.type)?.fields ?? {};
    for (const token of collectVisibleTokens(module.props, fields, audience)) {
      if (!owners.has(token)) {
        owners.set(token, module.id);
      }
    }
  }
  return owners;
}

// A prop the descriptor splits into dotted fields (`header.title`) only owns the tokens of those
// fields: an undeclared sibling such as a stored `header.overline` has no input to fill its gap.
function collectVisibleTokens(
  props: ImmersiveLayoutModule['props'],
  fields: Record<string, FieldDescriptor>,
  audience: ImmersivePlanAudience | null,
): string[] {
  return Object.entries(props).flatMap(([name, value]) => {
    const subFields = Object.entries(fields).filter(([path]) => path.startsWith(`${name}.`));
    if (subFields.length === 0) {
      return isHiddenProp(fields[name], audience, props) ? [] : extractTokens(value);
    }
    return subFields
      .filter(([, field]) => !isHiddenProp(field, audience, props))
      .flatMap(([path]) => {
        const subValue = readPropValue(props, path);
        return subValue === undefined ? [] : extractTokens(subValue);
      });
  });
}

function isHiddenProp(
  field: FieldDescriptor | undefined,
  audience: ImmersivePlanAudience | null,
  moduleProps: ImmersiveLayoutModule['props'],
): boolean {
  return field !== undefined && (isFieldHiddenForAudience(field, audience) || isFieldHiddenByValue(field, moduleProps));
}

// The unique tokens referenced anywhere in the document. Locale-independent: extract once and
// count misses per locale against the same list instead of re-walking the document per locale.
export function extractDocumentTokens(document: ImmersiveLayoutDocument, audience: ImmersivePlanAudience | null): string[] {
  return [...collectDocumentTokenOwners(document, audience).keys()];
}

// The one spelling of "this locale has this token". Empty is not missing: a key present with an
// empty string is valid and intentional in the real documents, so only absence counts as a gap.
// The locale badge and the publish gate must never disagree about that.
export function isTokenTranslated(translations: ImmersiveLayoutTranslations, token: string, locale: string): boolean {
  const bucket = translations[locale];
  return bucket !== undefined && Object.prototype.hasOwnProperty.call(bucket, token);
}

export function countMissingTranslationKeys(tokens: readonly string[], translations: ImmersiveLayoutTranslations, locale: string): number {
  if (translations[locale] === undefined) {
    return tokens.length;
  }
  return tokens.filter(token => !isTokenTranslated(translations, token, locale)).length;
}
