import type {
  FieldDescriptor,
  ImmersivePlanAudience,
  ModuleArrayDescriptor,
  ModuleDescriptor,
} from '../models/immersive-layout-descriptor.model';
import type { ImmersiveLayoutModule, ImmersiveLayoutTranslations, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import { effectiveModuleItems, splitPropPath, type ParsedModulePropPath } from './immersive-layout-prop-path.util';

// The one definition of the `{{token}}` grammar. Minting, exact matching, and occurrence
// scanning must all derive from this name pattern so they can never drift apart. The editor mints
// snake_case, but layouts written outside it may use kebab-case.
const TOKEN_NAME = '[a-zA-Z0-9_-]+';
const TOKEN_PATTERN = new RegExp(`^\\{\\{(${TOKEN_NAME})\\}\\}$`);
const TOKEN_OCCURRENCE_PATTERN = new RegExp(`\\{\\{(${TOKEN_NAME})\\}\\}`, 'g');

export interface CollectedField {
  // Enum members the editor declares but cannot render, carried from the array group so the field
  // view can leave them out of the dropdown. Only the `kind` field of such a group gets them.
  blockedEnumValues?: readonly string[];
  field: FieldDescriptor;
  label: string;
  // i18n key suffix under `planEdition.immersiveContentPlan`, resolved once here so the field view
  // and the diff header cannot drift apart on how a field is named.
  labelKey: string;
  path: string;
  groupPath?: string;
  itemField?: string;
  itemIndex?: number;
  unsupported?: boolean;
}

export function tokenOf(value: ImmersiveLayoutValue | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const match = TOKEN_PATTERN.exec(value);
  return match?.[1] ?? null;
}

export function wrapToken(token: string): string {
  return `{{${token}}}`;
}

// Which item fields carry copy. Item identity, reorder eligibility and token minting all key off
// this same selection, so it lives once here rather than as three filters that can drift.
export function tokenFieldNamesOf(group: ModuleArrayDescriptor): string[] {
  return Object.entries(group.fields)
    .filter(([, field]) => field.kind === 'token')
    .map(([name]) => name);
}

export function extractTokens(value: ImmersiveLayoutValue): string[] {
  if (typeof value === 'string') {
    return [...value.matchAll(TOKEN_OCCURRENCE_PATTERN)].map(match => match[1]);
  }
  if (Array.isArray(value)) {
    return value.flatMap(extractTokens);
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(extractTokens);
  }
  return [];
}

// Rewrites every `{{token}}` occurrence through `rename`.
export function replaceTokens<T extends ImmersiveLayoutValue>(value: T, rename: (token: string) => string): T {
  const rewritten = JSON.stringify(value).replace(TOKEN_OCCURRENCE_PATTERN, (_, token: string) => wrapToken(rename(token)));
  return JSON.parse(rewritten) as T; // tokens are `[\w]+`, so the JSON round trip is lossless
}

export function translationOf(translations: ImmersiveLayoutTranslations, token: string, locale: string): string | null {
  const bucket = translations[locale];
  if (bucket === undefined || !Object.prototype.hasOwnProperty.call(bucket, token)) {
    return null;
  }
  return bucket[token];
}

// An `isHidden` field stays in the contract, read and written back untouched, but never reaches the
// editor: no field view, no gap, no draft-diff entry, no publish check.
function editableFieldEntries(fields: Record<string, FieldDescriptor>): [string, FieldDescriptor][] {
  return Object.entries(fields).filter(([, field]) => field.isHidden !== true);
}

// A field with `visibleFor` is rendered, and owns a translation token, only for that plan audience.
// Applied on top of the collection so the contract-wide `isHidden` pass stays audience-agnostic.
// An unknown audience (`null`) hides every scoped field until the plan detail says which one applies.
// A field with `featureFlag` is shown only while that flag is in `enabledFlags`.
export function isFieldHiddenForAudience(
  field: FieldDescriptor,
  audience: ImmersivePlanAudience | null,
  enabledFlags: ReadonlySet<string> = new Set(),
): boolean {
  return (
    field.isHidden === true ||
    (field.visibleFor !== undefined && field.visibleFor !== audience) ||
    (field.featureFlag !== undefined && !enabledFlags.has(field.featureFlag))
  );
}

// A module-level field with `visibleWhen` shows only while its sibling prop holds the declared
// value; an absent sibling reads as `null`. Separate from `isFieldHiddenForAudience` because it
// needs the module's props, which the audience predicate has no reason to carry.
export function isFieldHiddenByValue(field: FieldDescriptor, moduleProps: ImmersiveLayoutModule['props']): boolean {
  const { visibleWhen } = field;
  return visibleWhen !== undefined && (moduleProps[visibleWhen.field] ?? null) !== visibleWhen.equals;
}

export function collectModuleFields(module: ImmersiveLayoutModule, descriptor: ModuleDescriptor): CollectedField[] {
  const fields: CollectedField[] = [];

  for (const [name, field] of editableFieldEntries(descriptor.fields ?? {})) {
    fields.push({ field, label: name, labelKey: labelKeyOf(field, name), path: name });
  }

  // Schema-first: every descriptor-declared item field is emitted for every row, whether or not
  // the row carries the key — the backend strips null fields, so the payload under-reports them.
  for (const group of descriptor.arrays ?? []) {
    collectArrayFields(module, group, group.path, fields);
  }

  return fields;
}

export interface ResolvedArrayGroup {
  group: ModuleArrayDescriptor;
  groupPath: string;
}

// Every array group on a module, top-level AND every nested child group folded into the row it
// lives on (`items.0.subitems`, one child level today but nothing here caps the depth). Mirrors the
// recursion `collectArrayFields` uses to resolve field paths, so callers that need to know "which
// resolved groups exist on this module" (the diff engine) can never disagree with the field
// collector on where a nested group's items actually live (DR-176).
export function resolveArrayGroups(module: ImmersiveLayoutModule, descriptor: ModuleDescriptor): ResolvedArrayGroup[] {
  const groups: ResolvedArrayGroup[] = [];
  for (const group of descriptor.arrays ?? []) {
    collectResolvedArrayGroups(module, group, group.path, groups);
  }
  return groups;
}

function collectResolvedArrayGroups(
  module: ImmersiveLayoutModule,
  group: ModuleArrayDescriptor,
  groupPath: string,
  groups: ResolvedArrayGroup[],
): void {
  groups.push({ group, groupPath });
  effectiveModuleItems(module, groupPath).forEach((row, itemIndex) => {
    for (const child of group.arrays ?? []) {
      collectResolvedArrayGroups(module, child, `${groupPath}.${itemIndex}.${child.path}`, groups);
    }
  });
}

// Recurses into a group's own `arrays` (one child level today, but nothing here caps the depth) for
// every row, resolving the child's path against the ROW it lives on — `${groupPath}.${itemIndex}.${child.path}`
// — since a child descriptor only ever declares its path relative to that row.
function collectArrayFields(
  module: ImmersiveLayoutModule,
  group: ModuleArrayDescriptor,
  groupPath: string,
  fields: CollectedField[],
): void {
  const unsupportedItemKinds = group.unsupportedItemKinds ?? [];
  effectiveModuleItems(module, groupPath).forEach((row, itemIndex) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      return;
    }
    const unsupported = unsupportedItemKinds.includes(typeof row.kind === 'string' ? row.kind : '');
    for (const [name, field] of editableFieldEntries(group.fields)) {
      fields.push({
        blockedEnumValues: name === 'kind' ? unsupportedItemKinds : undefined,
        field,
        groupPath,
        itemField: name,
        itemIndex,
        label: name,
        labelKey: labelKeyOf(field, name),
        path: `${groupPath}.${itemIndex}.${name}`,
        unsupported,
      });
    }
    for (const child of group.arrays ?? []) {
      collectArrayFields(module, child, `${groupPath}.${itemIndex}.${child.path}`, fields);
    }
  });
}

function labelKeyOf(field: FieldDescriptor, name: string): string {
  return field.labelKey ?? `fields.${name}`;
}

// The descriptor a parsed prop-draft key points at: module-level by prop path, item-level through
// the array group the key names.
export function findFieldDescriptor(descriptor: ModuleDescriptor, parsed: ParsedModulePropPath): FieldDescriptor | undefined {
  if (parsed.arrayPath === undefined || parsed.itemField === undefined) {
    return descriptor.fields?.[parsed.propPath];
  }
  return findArrayDescriptor(descriptor, parsed.arrayPath)?.fields[parsed.itemField];
}

// A RESOLVED group path (row indices included, e.g. `items.1.subitems`) back to the static group
// descriptor it belongs to. A top-level group matches directly; a child group matches once its
// parent's row index is stripped out, since the child only ever declares its path relative to the
// row (see `ModuleArrayDescriptor.arrays`).
export function findArrayDescriptor(descriptor: ModuleDescriptor, resolvedGroupPath: string): ModuleArrayDescriptor | undefined {
  const staticPath = stripIndexSegments(resolvedGroupPath);
  for (const group of descriptor.arrays ?? []) {
    if (group.path === staticPath) {
      return group;
    }
    for (const child of group.arrays ?? []) {
      if (`${group.path}.${child.path}` === staticPath) {
        return child;
      }
    }
  }
  return undefined;
}

function stripIndexSegments(path: string): string {
  return splitPropPath(path)
    .filter((segment): segment is string => typeof segment === 'string')
    .join('.');
}
