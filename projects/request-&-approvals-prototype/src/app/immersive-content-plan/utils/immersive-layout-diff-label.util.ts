import { GENERAL_SETTINGS_ID } from '../models/immersive-content-plan-editor.model';
import type { ModuleArrayDescriptor, ModuleDescriptor } from '../models/immersive-layout-descriptor.model';
import { getDescriptor } from '../models/immersive-layout-descriptor.registry';
import type { ImmersiveLayoutDocument, ImmersiveLayoutModule, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import { pickItemLabelField } from './immersive-layout-field-view.util';
import { collectModuleFields, findArrayDescriptor, tokenOf, wrapToken, type CollectedField } from './immersive-layout-field.util';
import { collectEditableModules, parseEditableModuleKey } from './immersive-layout-general-settings.util';
import { formatImmersiveLocaleLabel } from './immersive-layout-locale-label.util';
import { PREFERRED_BASE_LOCALE, resolveBaseLocale, resolveTokenLabel } from './immersive-layout-locale.util';
import { resolveModuleLabel } from './immersive-layout-module-label.util';
import { readPropValue } from './immersive-layout-prop-path.util';
import type { WorkingChange } from './immersive-layout-working.util';

const I18N_PREFIX = 'planEdition.immersiveContentPlan';
const MAX_LABEL_LENGTH = 48;

// Every part of a diff header, still unresolved: i18n keys stay keys so the pure layer never needs
// a `TranslateService`, and the caller decides when to spend a translation lookup.
export interface DiffHeader {
  fieldLabelKey: string | null;
  itemTitle: string | null;
  locale: string | null;
  // Resolved from the document (a navbar label or the descriptor name), so it needs no translation.
  moduleLabel: string | null;
  moduleLabelKey: string | null;
}

export interface WorkingDiffEntry {
  change: WorkingChange;
  header: DiffHeader;
  newText: string;
  oldText: string;
}

/**
 * The document walked once, not once per change.
 *
 * Resolving a header used to rebuild the descriptor field list of every module for every single
 * change, so a dialog listing N changes cost N × modules full traversals. Both maps below answer
 * the same questions from one pass, and they live only for the duration of the call.
 */
interface DiffLabelIndex {
  fieldsByModuleId: Map<string, CollectedField[]>;
  moduleById: Map<string, ImmersiveLayoutModule>;
  ownerByToken: Map<string, { collected: CollectedField; module: ImmersiveLayoutModule }>;
}

function buildDiffLabelIndex(working: ImmersiveLayoutDocument): DiffLabelIndex {
  const fieldsByModuleId = new Map<string, CollectedField[]>();
  const moduleById = new Map<string, ImmersiveLayoutModule>();
  const ownerByToken = new Map<string, { collected: CollectedField; module: ImmersiveLayoutModule }>();

  for (const module of collectEditableModules(working)) {
    moduleById.set(module.id, module);
    const descriptor = getDescriptor(module.type);
    if (descriptor === undefined) {
      continue;
    }
    const fields = collectModuleFields(module, descriptor);
    fieldsByModuleId.set(module.id, fields);
    for (const collected of fields) {
      if (collected.field.kind !== 'token') {
        continue;
      }
      const token = tokenOf(readPropValue(module.props, collected.path));
      // Modules are walked in document order and the first owner wins, matching the old loop that
      // returned on its first hit.
      if (token !== null && !ownerByToken.has(token)) {
        ownerByToken.set(token, { collected, module });
      }
    }
  }

  return { fieldsByModuleId, moduleById, ownerByToken };
}

// `channelNames` maps a channel id to its name; a channel it does not know is labelled by its id.
export function labelWorkingChanges(
  changes: readonly WorkingChange[],
  working: ImmersiveLayoutDocument | null,
  baseLocale: string | null,
  channelNames: Readonly<Record<string, string>> = {},
): WorkingDiffEntry[] {
  if (working === null || changes.length === 0) {
    return [];
  }
  const index = buildDiffLabelIndex(working);
  return changes.map(change => ({
    change,
    header: withChannelLabel(resolveDiffHeader(change, working, baseLocale, index), change, index, channelNames),
    newText: formatChangeValue(change, change.newValue, working),
    oldText: formatChangeValue(change, change.oldValue, working),
  }));
}

export function formatDiffHeader(header: DiffHeader, translate: (key: string, params?: Record<string, unknown>) => string): string {
  const moduleLabel = header.moduleLabel ?? (header.moduleLabelKey === null ? null : translate(header.moduleLabelKey));
  const parts = [
    moduleLabel,
    header.itemTitle === null ? null : `"${truncateLabel(header.itemTitle)}"`,
    header.fieldLabelKey === null ? null : translate(header.fieldLabelKey),
    header.locale === null ? null : formatImmersiveLocaleLabel(header.locale),
  ];
  return parts.filter((part): part is string => part !== null && part !== '').join(' · ');
}

// A variant is reported under its editable key, so its header names the channel next to the module.
function withChannelLabel(
  header: DiffHeader,
  change: WorkingChange,
  index: DiffLabelIndex,
  channelNames: Readonly<Record<string, string>>,
): DiffHeader {
  const key = change.kind === 'copy' ? index.ownerByToken.get(change.token ?? '')?.module.id : change.moduleId;
  const channelId = key === undefined ? null : parseEditableModuleKey(key).channelId;
  return channelId === null || header.moduleLabel === null
    ? header
    : { ...header, moduleLabel: `${header.moduleLabel} · ${channelNames[channelId] ?? channelId}` };
}

function resolveDiffHeader(
  change: WorkingChange,
  working: ImmersiveLayoutDocument,
  baseLocale: string | null,
  index: DiffLabelIndex,
): DiffHeader {
  if (change.moduleId === GENERAL_SETTINGS_ID && change.fieldPath !== undefined) {
    return {
      fieldLabelKey: `${I18N_PREFIX}.fields.${change.fieldPath}`,
      itemTitle: null,
      locale: null,
      moduleLabel: null,
      moduleLabelKey: `${I18N_PREFIX}.generalSettings`,
    };
  }
  if (change.kind === 'copy') {
    return resolveCopyHeader(change, working, baseLocale, index);
  }
  if (change.kind === 'module') {
    return resolveModuleSetHeader(change, working, baseLocale, index);
  }
  return resolveModuleHeader(change, working, baseLocale, index);
}

// Added and removed read from opposite documents by construction: an added module's id is already
// in `working` (and therefore in `index`, which is built from it), a removed one never is. The
// removed branch falls back to the type's own descriptor label — the only name left for a module
// `working` no longer carries at all — exactly like `resolveCopyHeader` falls back to the raw
// `{{token}}` once its owning field is gone.
function resolveModuleSetHeader(
  change: WorkingChange,
  working: ImmersiveLayoutDocument,
  baseLocale: string | null,
  index: DiffLabelIndex,
): DiffHeader {
  const isAdded = change.newValue !== undefined;
  const type = isAdded ? change.newValue : change.oldValue;
  const module = change.moduleId === undefined ? undefined : index.moduleById.get(change.moduleId);
  const moduleLabel =
    module !== undefined
      ? resolveModuleLabel(module, working.translations, baseLocale)
      : ((typeof type === 'string' ? getDescriptor(type)?.label : undefined) ?? null);
  return {
    fieldLabelKey: `${I18N_PREFIX}.${isAdded ? 'moduleAdded' : 'moduleRemoved'}`,
    itemTitle: null,
    locale: null,
    moduleLabel,
    moduleLabelKey: null,
  };
}

function resolveCopyHeader(
  change: WorkingChange,
  working: ImmersiveLayoutDocument,
  baseLocale: string | null,
  index: DiffLabelIndex,
): DiffHeader {
  const token = change.token ?? '';
  const locale = change.locale ?? null;
  const owner = index.ownerByToken.get(token);

  if (owner === undefined) {
    // No field owns the token any more (it was renamed, or the module was removed): the raw
    // `{{token}}` is the only honest name left for it.
    return { fieldLabelKey: null, itemTitle: null, locale, moduleLabel: wrapToken(token), moduleLabelKey: null };
  }

  return {
    fieldLabelKey: `${I18N_PREFIX}.${owner.collected.labelKey}`,
    itemTitle: resolveItemTitle(owner.module, owner.collected, working, baseLocale),
    locale,
    moduleLabel: resolveModuleLabel(owner.module, working.translations, baseLocale),
    moduleLabelKey: null,
  };
}

function resolveModuleHeader(
  change: WorkingChange,
  working: ImmersiveLayoutDocument,
  baseLocale: string | null,
  index: DiffLabelIndex,
): DiffHeader {
  const module = change.moduleId === undefined ? undefined : index.moduleById.get(change.moduleId);
  if (module === undefined) {
    return { fieldLabelKey: null, itemTitle: null, locale: null, moduleLabel: null, moduleLabelKey: null };
  }
  const descriptor = getDescriptor(module.type);
  const moduleLabel = resolveModuleLabel(module, working.translations, baseLocale);

  if (change.kind === 'array') {
    const group =
      change.groupPath === undefined || descriptor === undefined ? undefined : findArrayDescriptor(descriptor, change.groupPath);
    return {
      fieldLabelKey: group === undefined ? null : `${I18N_PREFIX}.${group.labelKey}`,
      itemTitle: null,
      locale: null,
      moduleLabel,
      moduleLabelKey: null,
    };
  }

  if (change.kind === 'reorder') {
    return resolveReorderHeader(change, module, descriptor, working, baseLocale, moduleLabel);
  }

  const collected = index.fieldsByModuleId.get(module.id)?.find(candidate => candidate.path === change.fieldPath);
  return {
    fieldLabelKey: collected === undefined ? null : `${I18N_PREFIX}.${collected.labelKey}`,
    itemTitle: collected === undefined ? null : resolveItemTitle(module, collected, working, baseLocale),
    locale: null,
    moduleLabel,
    moduleLabelKey: null,
  };
}

// The moved item's title at its new index; `groupPath === undefined` means the module itself moved.
function resolveReorderHeader(
  change: WorkingChange,
  module: ImmersiveLayoutModule,
  descriptor: ModuleDescriptor | undefined,
  working: ImmersiveLayoutDocument,
  baseLocale: string | null,
  moduleLabel: string,
): DiffHeader {
  const group = change.groupPath === undefined || descriptor === undefined ? undefined : findArrayDescriptor(descriptor, change.groupPath);
  const itemIndex = typeof change.newValue === 'number' ? change.newValue : undefined;
  const itemTitle =
    group === undefined || itemIndex === undefined || change.groupPath === undefined
      ? null
      : resolveGroupItemTitle(module, group, change.groupPath, itemIndex, working, baseLocale);
  return {
    fieldLabelKey: itemTitle === null && group !== undefined ? `${I18N_PREFIX}.${group.labelKey}` : null,
    itemTitle,
    locale: null,
    moduleLabel,
    moduleLabelKey: null,
  };
}

// The descriptive field of an array row — its first single-line token — read in the base locale, so
// "answer of item 2" reads as the question the reviewer recognises.
function resolveItemTitle(
  module: ImmersiveLayoutModule,
  collected: CollectedField,
  document: ImmersiveLayoutDocument,
  baseLocale: string | null,
): string | null {
  if (collected.groupPath === undefined || collected.itemIndex === undefined) {
    return null;
  }
  const descriptor = getDescriptor(module.type);
  const group = descriptor === undefined ? undefined : findArrayDescriptor(descriptor, collected.groupPath);
  if (group === undefined) {
    return null;
  }
  return resolveGroupItemTitle(module, group, collected.groupPath, collected.itemIndex, document, baseLocale);
}

function resolveGroupItemTitle(
  module: ImmersiveLayoutModule,
  group: ModuleArrayDescriptor,
  resolvedGroupPath: string,
  itemIndex: number,
  document: ImmersiveLayoutDocument,
  baseLocale: string | null,
): string | null {
  const labelField = pickItemLabelField(Object.entries(group.fields))?.[0];
  if (labelField === undefined) {
    return null;
  }
  const items = readPropValue(module.props, resolvedGroupPath);
  if (!Array.isArray(items)) {
    return null;
  }
  const item = items[itemIndex];
  if (item === undefined || typeof item !== 'object' || item === null || Array.isArray(item)) {
    return null;
  }
  const labelToken = tokenOf(item[labelField]);
  if (labelToken === null) {
    return null;
  }
  return resolveTokenLabel(document.translations, labelToken, baseLocale);
}

function truncateLabel(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length <= MAX_LABEL_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_LABEL_LENGTH - 3)}…`;
}

function formatChangeValue(change: WorkingChange, value: ImmersiveLayoutValue | undefined, working: ImmersiveLayoutDocument): string {
  if (change.kind !== 'base_locale') {
    return formatValue(value);
  }
  const locale = value ?? resolveBaseLocale(working.available_languages, PREFERRED_BASE_LOCALE);
  return typeof locale === 'string' ? formatImmersiveLocaleLabel(locale) : '';
}

function formatValue(value: ImmersiveLayoutValue | undefined): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map(item => String(item)).join(', ');
  }
  return String(value);
}
