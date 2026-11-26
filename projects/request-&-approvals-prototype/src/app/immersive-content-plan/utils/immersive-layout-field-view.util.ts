import type { IgntButtonDropdownOption } from '@ignite/legacy/components/ignt-button-dropdown/ignt-button-dropdown.component';

import type { FieldDescriptor, FieldKind, ModuleArrayDescriptor } from '../models/immersive-layout-descriptor.model';
import type { ImmersiveLayoutModule, ImmersiveLayoutTranslations, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import { mediaCheckKey, type MediaChecks, type MediaProbeKind } from '../models/immersive-media-check.model';
import { fieldErrorKey } from './immersive-content-plan-derivations.util';
import { tokenOf, translationOf, type CollectedField } from './immersive-layout-field.util';
import { generateFieldToken } from './immersive-layout-items.util';
import { isTokenTranslated } from './immersive-layout-locale-gaps.util';
import { resolveMediaKindForField } from './immersive-layout-media-urls.util';
import { readPropValue, valuesEqual } from './immersive-layout-prop-path.util';
import { isReorderableGroup } from './immersive-layout-reorder.util';
import { isHttpsUrl } from './immersive-layout-url.util';

// Everything a field row renders, resolved once per state change. Templates read plain
// properties off this view instead of calling per-field methods on every change detection.
export interface ModuleFieldView {
  baseHint: string;
  checked: boolean;
  collected: CollectedField;
  dirty: boolean;
  enumLabel: string;
  enumOptions: IgntButtonDropdownOption<string | null>[];
  gap: boolean;
  helperKey: string;
  inputId: string;
  inputType: 'number' | 'text' | 'url';
  isLiteral: boolean;
  kind: FieldKind;
  labelKey: string;
  media: MediaFieldView | null;
  multiline: boolean;
  nullWhenEmpty: boolean;
  placeholderKey: string;
  raw: ImmersiveLayoutValue | undefined;
  richText: boolean;
  showBaseHint: boolean;
  // Renders as a switch with its own input to the right, self-driven: the switch reflects whether
  // the field already has a value (`field.isSwitchable`).
  isSwitchable: boolean;
  text: string;
  token: string | null;
  // Non-base locales this token still lacks; `null` for anything that is not a translatable token.
  translationGap: TranslationGap | null;
}

export interface TranslationGap {
  missing: number;
  total: number;
}

export type MediaFieldStatus = 'broken' | 'checking' | 'idle' | 'invalid' | 'ok' | 'stored';

// What a url field renders alongside its input. A `media`-flagged one carries the probe outcome for
// its current value, resolved fresh on every state change so a keystroke never shows a stale
// status; a link carries only `idle` or `invalid`, since nothing is ever probed for it.
export interface MediaFieldView {
  errorKey: string | null;
  height: number | null;
  kind: 'image' | 'video' | null;
  status: MediaFieldStatus;
  url: string;
  width: number | null;
}

const INPUT_TYPE_BY_KIND: Partial<Record<FieldKind, 'number' | 'url'>> = {
  number: 'number',
  url: 'url',
};

const PLACEHOLDER_KEY_BY_KIND: Partial<Record<FieldKind, string>> = {
  token: 'tokenPlaceholder',
  url: 'urlPlaceholder',
};

const linkUrlPlaceholderKey = 'linkUrlPlaceholder';

const LITERAL_HELPER_KEY = 'fixedValueHelper';
const I18N_PREFIX = 'planEdition.immersiveContentPlan';

export type ModuleFieldShell = Omit<ModuleFieldView, 'dirty' | 'text'>;

export interface ModuleFieldShellContext {
  availableLanguages?: readonly string[];
  baseLocale: string | null;
  committedModule: ImmersiveLayoutModule;
  fieldErrorPaths?: ReadonlySet<string>;
  locale: string | null;
  mediaChecks?: MediaChecks;
  // `mediaCheckKey` pairs a keystroke just introduced (`store.newMediaUrls()`, keyed via
  // `mediaCheckKeyOf`), never the whole committed document: what separates `checking` (the
  // automatic probe will reach it shortly) from `stored` (a committed value nothing has probed
  // yet — the preview click is what probes it).
  newMediaKeys?: ReadonlySet<string>;
  module: ImmersiveLayoutModule;
  translations: ImmersiveLayoutTranslations;
}

export interface ModuleFieldDirtyContext {
  committedModule: ImmersiveLayoutModule;
  committedTranslations: ImmersiveLayoutTranslations;
  locale: string | null;
  translations: ImmersiveLayoutTranslations;
}

export function buildModuleFieldShells(
  module: ImmersiveLayoutModule,
  fields: CollectedField[],
  context: ModuleFieldShellContext,
): ModuleFieldShell[] {
  return fields.map(collected => buildFieldShell(module, collected, context));
}

export function resolveModuleFieldViews(moduleId: string, shells: ModuleFieldShell[], context: ModuleFieldDirtyContext): ModuleFieldView[] {
  return shells.map(shell => ({
    ...shell,
    dirty: fieldDirty(moduleId, shell, context),
    text: fieldText(shell, context),
  }));
}

export function buildModuleFieldViews(
  module: ImmersiveLayoutModule,
  fields: CollectedField[],
  context: ModuleFieldShellContext & ModuleFieldDirtyContext,
): ModuleFieldView[] {
  const shells = buildModuleFieldShells(module, fields, context);
  return resolveModuleFieldViews(module.id, shells, context);
}

export interface ArrayGroupRowView {
  // This row's own nested groups (e.g. a lineup item's `subitems`), one level deep today — nothing
  // here caps it further. Empty for a row whose descriptor declares no child `arrays`.
  childGroups: ArrayGroupView[];
  fields: ModuleFieldView[];
  // Missing translations plus validator field errors across the row's OWN fields: a child group's
  // gaps surface on ITS OWN rows, not rolled up into the parent's badge.
  gapCount: number;
  index: number;
  title: string;
  trackId: string;
  unsupported: boolean;
}

export interface ArrayGroupView {
  group: ModuleArrayDescriptor;
  // The RESOLVED path this group actually lives at: equal to `group.path` for a top-level group,
  // and `${parent.groupPath}.${parentRowIndex}.${group.path}` for a child group. Every write
  // (add/remove/move) must use this, never `group.path`, which is only the static declaration.
  groupPath: string;
  labelKey: string;
  // False once the row count sits at the group's `minItems` floor, so Remove is blocked there.
  removable: boolean;
  reorderable: boolean;
  rows: ArrayGroupRowView[];
}

export interface ModuleContentView {
  arrayGroups: ArrayGroupView[];
  moduleLevelFields: ModuleFieldView[];
}

// Depth-first so a field on a NESTED row (e.g. a lineup subitem) is found too, not just the
// top-level rows a flat `group.rows` would have stopped at. A group with no child groups returns
// just its own rows.
export function flattenGroupRows(group: ArrayGroupView): ArrayGroupRowView[] {
  return group.rows.flatMap(row => [row, ...row.childGroups.flatMap(flattenGroupRows)]);
}

export interface ModuleContentViewContext {
  moduleId: string;
  translate: (key: string, params?: Record<string, unknown>) => string;
  translations: ImmersiveLayoutTranslations;
}

export function buildModuleContentView(
  views: ModuleFieldView[],
  arrays: readonly ModuleArrayDescriptor[],
  context: ModuleContentViewContext,
): ModuleContentView {
  const moduleLevelFields = views.filter(view => view.collected.groupPath === undefined || view.collected.itemIndex === undefined);
  const viewsByGroupPath = bucketViewsByGroupPath(views);
  const arrayGroups = arrays.map(group => buildArrayGroupView(group, group.path, viewsByGroupPath, context));

  return { arrayGroups, moduleLevelFields };
}

// One pass over every view, bucketed by its own RESOLVED groupPath — nested or not, since a view
// already carries the fully resolved path it lives at. `buildArrayGroupView` then looks a group's
// own views up once instead of re-filtering the whole array on every group and every recursion.
function bucketViewsByGroupPath(views: ModuleFieldView[]): Map<string, ModuleFieldView[]> {
  const bucket = new Map<string, ModuleFieldView[]>();
  for (const view of views) {
    const { groupPath } = view.collected;
    if (groupPath === undefined) {
      continue;
    }
    const current = bucket.get(groupPath);
    if (current === undefined) {
      bucket.set(groupPath, [view]);
    } else {
      current.push(view);
    }
  }
  return bucket;
}

// A group's rows are matched by (RESOLVED groupPath, itemIndex): the resolved path already carries
// every ancestor row's own index, so a child group's rows can never collide with an unrelated
// sibling row's child group of the same shape (two empty `subitems` arrays, say). Recursing through
// `group.arrays` is what lets a row carry its own nested groups without a second builder.
function buildArrayGroupView(
  group: ModuleArrayDescriptor,
  groupPath: string,
  viewsByGroupPath: ReadonlyMap<string, ModuleFieldView[]>,
  context: ModuleContentViewContext,
): ArrayGroupView {
  const rowsByIndex = new Map<number, ModuleFieldView[]>();
  for (const view of viewsByGroupPath.get(groupPath) ?? []) {
    if (view.collected.itemIndex === undefined) {
      continue;
    }
    const current = rowsByIndex.get(view.collected.itemIndex);
    if (current === undefined) {
      rowsByIndex.set(view.collected.itemIndex, [view]);
    } else {
      current.push(view);
    }
  }

  const rows = [...rowsByIndex.entries()].map(([index, fields]) => ({
    childGroups: (group.arrays ?? []).map(child =>
      buildArrayGroupView(child, `${groupPath}.${index}.${child.path}`, viewsByGroupPath, context),
    ),
    fields,
    gapCount: rowGapCount(fields),
    index,
    title: moduleItemTitle(fields) || context.translate(`${I18N_PREFIX}.itemHeading`, { index: index + 1 }),
    trackId: arrayGroupRowTrackId(groupPath, index, fields, context),
    unsupported: fields[0]?.collected.unsupported === true,
  }));

  return {
    group,
    groupPath,
    labelKey: `${I18N_PREFIX}.${group.labelKey}`,
    removable: rows.length > (group.minItems ?? 0),
    reorderable: isReorderableGroup(group, rows.length),
    rows,
  };
}

function rowGapCount(fields: ModuleFieldView[]): number {
  return fields.reduce((count, field) => count + (field.translationGap?.missing ?? 0) + (field.gap ? 1 : 0), 0);
}

function arrayGroupRowTrackId(
  groupPath: string,
  index: number,
  fields: ModuleFieldView[],
  context: Pick<ModuleContentViewContext, 'moduleId' | 'translations'>,
): string {
  const tokens = fields.flatMap(field => rowTrackToken(field, context));
  if (tokens.length > 0) {
    return `${groupPath}:${tokens.join('|')}`;
  }
  return `${groupPath}:${index}`;
}

function rowTrackToken(field: ModuleFieldView, context: Pick<ModuleContentViewContext, 'moduleId' | 'translations'>): string[] {
  if (field.kind !== 'token') {
    return [];
  }
  if (field.token !== null) {
    return [field.token];
  }
  if (field.raw !== undefined) {
    return [];
  }
  return [
    generateFieldToken(context.moduleId, field.collected.label, field.collected.itemIndex, context.translations, field.collected.groupPath),
  ];
}

// The one rule for "which field names an array row": its `title` or `label` field when it has one,
// otherwise its first single-line token wherever it is declared. The item list and the publish diff
// must pick the same one, or the dialog names a row differently from the panel the user just
// edited it in.
export function isItemLabelField(field: { kind: FieldKind; multiline?: boolean }): boolean {
  return field.kind === 'token' && field.multiline !== true;
}

const itemTitleFieldNames: readonly string[] = ['title', 'label'];

export function pickItemLabelField<T extends { kind: FieldKind; multiline?: boolean }>(
  entries: readonly (readonly [string, T])[],
): readonly [string, T] | undefined {
  const labelEntries = entries.filter(([, field]) => isItemLabelField(field));
  return labelEntries.find(([name]) => itemTitleFieldNames.includes(name)) ?? labelEntries[0];
}

export function moduleItemTitle(fields: ModuleFieldView[]): string {
  const labelField = pickItemLabelField(fields.map(field => [field.collected.label, field] as const))?.[1];
  return labelField === undefined ? '' : labelField.text.trim();
}

function buildFieldShell(module: ImmersiveLayoutModule, collected: CollectedField, context: ModuleFieldShellContext): ModuleFieldShell {
  const {
    availableLanguages = [],
    baseLocale,
    fieldErrorPaths,
    locale,
    mediaChecks = {},
    newMediaKeys = new Set(),
    translations,
  } = context;
  const { field } = collected;
  const raw = readPropValue(module.props, collected.path);
  const token = field.kind === 'token' ? tokenOf(raw) : null;
  const enumValue = raw === null || raw === undefined ? null : String(raw);
  const isLiteral = field.kind === 'token' && token === null && raw !== undefined && !isSwitchOffValue(field, raw);
  // The sibling `type` decides how this url is actually probed — see `resolveMediaKindForField` —
  // so the media view (and the cache key it reads) must key on that resolved kind, never the
  // descriptor's own `media` flag alone.
  const mediaKind = resolveMediaKindForField(module, collected);

  return {
    baseHint: token === null || baseLocale === null ? '' : (translationOf(translations, token, baseLocale) ?? ''),
    checked: raw === true,
    collected,
    enumLabel: field.kind === 'enum' ? (enumValue ?? '—') : '',
    enumOptions: field.kind === 'enum' ? buildEnumOptions(field.enumValues ?? [], enumValue, collected.blockedEnumValues ?? []) : [],
    gap: fieldErrorPaths?.has(fieldErrorKey(module.id, collected.path)) === true,
    helperKey: prefixKey(isLiteral ? LITERAL_HELPER_KEY : (field.helperKey ?? '')),
    inputId: fieldInputId(module, collected),
    inputType: INPUT_TYPE_BY_KIND[field.kind] ?? 'text',
    isLiteral,
    kind: field.kind,
    labelKey: `${I18N_PREFIX}.${collected.labelKey}`,
    media: resolveMediaFieldView(field, raw, mediaChecks, newMediaKeys, mediaKind) ?? resolveLinkFieldView(field, raw),
    multiline: field.multiline === true,
    nullWhenEmpty: field.nullWhenEmpty === true,
    placeholderKey: prefixKey(field.placeholderKey ?? defaultPlaceholderKey(field)),
    raw,
    richText: field.richText === true,
    showBaseHint: field.kind === 'token' && baseLocale !== null && locale !== null && locale !== baseLocale,
    isSwitchable: field.isSwitchable === true,
    token,
    translationGap: token === null ? null : translationGapOf(token, availableLanguages, baseLocale, translations),
  };
}

// A url field without `media` is a link, not an asset: it never gets the media paste copy.
function defaultPlaceholderKey(field: Pick<FieldDescriptor, 'kind' | 'media'>): string {
  if (field.kind === 'url' && field.media === undefined) {
    return linkUrlPlaceholderKey;
  }
  return PLACEHOLDER_KEY_BY_KIND[field.kind] ?? '';
}

// Resolved once per state change from the descriptor's `media` flag, the working value and the
// store's probe results — never inline in the template, so a keystroke and a probe reply agree on
// exactly one status per field. `media` is the *resolved* probe kind (see `resolveMediaKindForField`),
// never the descriptor's raw flag: it is what actually decided how this url was probed, so it is
// also what must decide which `mediaChecks` entry this field reads.
export function resolveMediaFieldView(
  field: Pick<FieldDescriptor, 'media'>,
  raw: ImmersiveLayoutValue | undefined,
  mediaChecks: MediaChecks,
  newMediaKeys: ReadonlySet<string>,
  media: MediaProbeKind,
): MediaFieldView | null {
  if (field.media === undefined) {
    return null;
  }
  if (typeof raw !== 'string' || raw.length === 0) {
    return { errorKey: null, height: null, kind: null, status: 'idle', url: '', width: null };
  }
  if (!isHttpsUrl(raw)) {
    return { errorKey: prefixKey('mediaUrlError'), height: null, kind: null, status: 'invalid', url: raw, width: null };
  }
  const key = mediaCheckKey(media, raw);
  const check = mediaChecks[key];
  if (check?.status === 'broken') {
    return { errorKey: prefixKey('mediaUrlError'), height: null, kind: null, status: 'broken', url: raw, width: null };
  }
  // A committed value stays `stored` whatever else the cache says: the form never renders stored
  // media on its own and the on-demand probe behind a preview click is not the row's business, so
  // it keeps the eye — no spinner. Only a value the editor just typed goes `checking` and then
  // `ok`, the moment its eye starts opening the preview.
  if (!newMediaKeys.has(key)) {
    return { errorKey: null, height: null, kind: null, status: 'stored', url: raw, width: null };
  }
  if (check === undefined || check.status === 'checking') {
    return { errorKey: null, height: null, kind: null, status: 'checking', url: raw, width: null };
  }
  return { errorKey: null, height: check.height ?? null, kind: check.kind ?? null, status: 'ok', url: raw, width: check.width ?? null };
}

// A link is shown to the shopper as typed, so it is judged by the same https rule as media, minus
// the probe: no preview, no spinner, only the format error.
export function resolveLinkFieldView(
  field: Pick<FieldDescriptor, 'kind' | 'media'>,
  raw: ImmersiveLayoutValue | undefined,
): MediaFieldView | null {
  if (field.kind !== 'url' || field.media !== undefined) {
    return null;
  }
  if (raw === undefined || raw === null || raw === '' || isHttpsUrl(raw)) {
    return { errorKey: null, height: null, kind: null, status: 'idle', url: '', width: null };
  }
  return {
    errorKey: prefixKey('urlError'),
    height: null,
    kind: null,
    status: 'invalid',
    url: typeof raw === 'string' ? raw : '',
    width: null,
  };
}

function translationGapOf(
  token: string,
  availableLanguages: readonly string[],
  baseLocale: string | null,
  translations: ImmersiveLayoutTranslations,
): TranslationGap {
  const locales = availableLanguages.filter(locale => locale !== baseLocale);
  return {
    missing: locales.filter(locale => !isTokenTranslated(translations, token, locale)).length,
    total: locales.length,
  };
}

// Some enum fields mirror a backend prop that is a plain nullable string guided by a documented
// list, not a schema enum — so stored layouts legitimately hold values the list never mentions.
// Leading with the stored value keeps it selectable instead of quietly swapping it for a listed one.
function buildEnumOptions(
  values: readonly (string | null)[],
  current: string | null,
  blocked: readonly string[],
): IgntButtonDropdownOption<string | null>[] {
  // A blocked value the row already holds stays listed — the dropdown has to name what the row is
  // — but it is never offered to a row that does not hold it yet.
  const offered = values.filter(value => value === current || value === null || !blocked.includes(value));
  const declared = offered.map(value => ({ label: value ?? '—', selected: value === current, value }));
  if (current === null || offered.includes(current)) {
    return declared;
  }
  return [{ label: current, selected: true, value: current }, ...declared];
}

// A switchable token is off while its key holds no text. Besides absence, that is `null`, the
// backend's own empty.
export function isSwitchOffValue(field: Pick<FieldDescriptor, 'isSwitchable'>, raw: ImmersiveLayoutValue | undefined): boolean {
  return field.isSwitchable === true && raw === null;
}

function prefixKey(suffix: string): string {
  return suffix === '' ? '' : `${I18N_PREFIX}.${suffix}`;
}

function fieldDirty(_moduleId: string, shell: ModuleFieldShell, context: ModuleFieldDirtyContext): boolean {
  const { committedModule, committedTranslations, locale, translations } = context;
  if (shell.kind === 'token' && shell.token !== null && locale !== null) {
    const workingText = translationOf(translations, shell.token, locale) ?? '';
    const committedText = translationOf(committedTranslations, shell.token, locale) ?? '';
    return workingText !== committedText;
  }
  const committedRaw = readPropValue(committedModule.props, shell.collected.path);
  return !valuesEqual(shell.raw, committedRaw);
}

function fieldInputId(module: ImmersiveLayoutModule, collected: CollectedField): string {
  return `immersive-field-${module.id}-${collected.path.replace(/\./g, '-')}`;
}

function fieldText(shell: ModuleFieldShell, context: ModuleFieldDirtyContext): string {
  const { locale, translations } = context;
  const { raw, token } = shell;
  if (token !== null) {
    if (locale === null) {
      return '';
    }
    return translationOf(translations, token, locale) ?? '';
  }
  if (typeof raw === 'string') {
    return raw;
  }
  if (typeof raw === 'number') {
    return String(raw);
  }
  return '';
}
