import type { ModuleArrayDescriptor } from '../models/immersive-layout-descriptor.model';
import type { ImmersiveLayoutDocument, ImmersiveLayoutTranslations, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import { tokenFieldNamesOf, tokenOf, wrapToken } from './immersive-layout-field.util';
import { resolveModuleGroupTarget } from './immersive-layout-general-settings.util';
import { applyAtPath } from './immersive-layout-patch.util';
import { isNestedGroupPath } from './immersive-layout-prop-path.util';
import { omitTokenTranslations, patchModuleProp, patchTranslation } from './immersive-layout-working.util';

export function addModuleItem<T extends ImmersiveLayoutDocument>(
  layout: T,
  moduleId: string,
  group: ModuleArrayDescriptor,
  resolvedGroupPath: string,
  baseLocale: string | null,
): T | null {
  const target = resolveModuleGroupTarget(layout, moduleId, resolvedGroupPath);
  if (target === null) {
    return null;
  }

  // A hidden field never reaches the editor, so a new row carries no key for it unless it declares
  // an `initialValue`.
  const itemFields = Object.entries(group.fields).filter(([, field]) => field.isHidden !== true || field.initialValue !== undefined);
  // A top-level group keeps the original, path-free prefix (`<moduleId>_<index>`) so every
  // existing token in the wild stays exactly as minted. A child group's resolved path always
  // differs from its own declared (row-relative) `path`, and two sibling rows' child groups
  // legitimately start at the same index — e.g. two empty `subitems` arrays under different
  // `items` rows — so the full resolved path (parent index included) goes into the prefix instead,
  // sanitized the same way `sanitizeTokenSegment` already maps every other segment.
  const basePrefix = !isNestedGroupPath(resolvedGroupPath)
    ? `${sanitizeTokenSegment(moduleId)}_${target.items.length}`
    : `${sanitizeTokenSegment(moduleId)}_${sanitizeTokenSegment(resolvedGroupPath)}_${target.items.length}`;
  const tokenPrefix = buildUniqueTokenPrefix(basePrefix, tokenFieldNamesOf(group), layout.translations);

  const item: Record<string, ImmersiveLayoutValue> = {};
  for (const [name, field] of itemFields) {
    if (field.isHidden === true) {
      item[name] = field.initialValue ?? null;
    } else if (field.kind === 'token') {
      const token = `${tokenPrefix}_${name}`;
      item[name] = wrapToken(token);
    } else if (field.kind === 'boolean') {
      item[name] = false;
    } else if (field.kind === 'enum') {
      item[name] = null;
    } else {
      item[name] = '';
    }
  }

  let next = applyAtPath(layout, target.path, [...target.items, item]);
  if (baseLocale !== null) {
    for (const [name, field] of itemFields) {
      if (field.kind !== 'token') {
        continue;
      }
      const token = tokenOf(item[name]);
      if (token !== null) {
        next = patchTranslation(next, baseLocale, token, '');
      }
    }
  }

  return next;
}

export function removeModuleItem<T extends ImmersiveLayoutDocument>(
  layout: T,
  moduleId: string,
  arrayPath: string,
  itemIndex: number,
): T | null {
  const target = resolveModuleGroupTarget(layout, moduleId, arrayPath);
  if (target === null) {
    return null;
  }
  const removed = target.items[itemIndex];
  if (removed === undefined) {
    return layout;
  }
  const next = applyAtPath(
    layout,
    target.path,
    target.items.filter((_, index) => index !== itemIndex),
  );
  return omitTokenTranslations(next, removed);
}

// `groupPath` is the field's RESOLVED group path (`CollectedField.groupPath`), only ever needed for
// a child array group: it contains a numeric segment (a parent row's index) precisely when two
// sibling rows' child groups could otherwise mint the same token at the same item index — see
// `addModuleItem`'s own prefix for the write-time half of the same rule.
export function generateFieldToken(
  moduleId: string,
  fieldLabel: string,
  itemIndex: number | undefined,
  translations: ImmersiveLayoutTranslations,
  groupPath?: string,
): string {
  const isNestedGroup = groupPath !== undefined && isNestedGroupPath(groupPath);
  const base =
    itemIndex === undefined
      ? `${sanitizeTokenSegment(moduleId)}_${sanitizeTokenSegment(fieldLabel)}`
      : isNestedGroup
        ? `${sanitizeTokenSegment(moduleId)}_${sanitizeTokenSegment(groupPath)}_${itemIndex}_${sanitizeTokenSegment(fieldLabel)}`
        : `${sanitizeTokenSegment(moduleId)}_${itemIndex}_${sanitizeTokenSegment(fieldLabel)}`;
  const taken = takenTokens(translations);
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}_${suffix}`)) {
    suffix += 1;
  }
  return `${base}_${suffix}`;
}

export function patchModuleItemProp<T extends ImmersiveLayoutDocument>(
  layout: T,
  moduleId: string,
  propPath: string,
  value: ImmersiveLayoutValue,
): T {
  return patchModuleProp(layout, moduleId, propPath, value);
}

export function sanitizeTokenSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function takenTokens(translations: ImmersiveLayoutTranslations): Set<string> {
  return new Set<string>(Object.values(translations).flatMap(bucket => Object.keys(bucket)));
}

function buildUniqueTokenPrefix(basePrefix: string, tokenFieldNames: string[], translations: ImmersiveLayoutTranslations): string {
  const taken = takenTokens(translations);
  const [base, startIndex] = splitTrailingIndex(basePrefix);
  let index = startIndex;
  for (;;) {
    const prefix = `${base}_${index}`;
    if (!tokenFieldNames.some(name => taken.has(`${prefix}_${name}`))) {
      return prefix;
    }
    index += 1;
  }
}

function splitTrailingIndex(prefix: string): [string, number] {
  const match = /^(.+)_(\d+)$/.exec(prefix);
  if (match === null) {
    return [prefix, 0];
  }
  return [match[1], Number(match[2])];
}
