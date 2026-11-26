import type { ImmersiveLayoutModule, ImmersiveLayoutProps, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import { getAtPath } from './immersive-layout-patch.util';

// Numeric segments address array indices, so they must reach the patch walker as numbers: a
// string '0' on an array reads as undefined and a write through it replaces the item wholesale.
export function splitPropPath(path: string): (string | number)[] {
  return path.split('.').map(segment => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

// A resolved group path carries a numeric segment precisely when it is a CHILD group's path (a
// parent row's index folded in, e.g. `items.0.subitems`) — a top-level group's own static `path`
// never contains one. The one predicate both the write side (`addModuleItem`'s token prefix) and
// the read side (`generateFieldToken`'s lazy mint) need to agree on the same resolved path.
export function isNestedGroupPath(resolvedGroupPath: string): boolean {
  return splitPropPath(resolvedGroupPath).some(segment => typeof segment === 'number');
}

function isImmersiveLayoutValue(value: unknown): value is ImmersiveLayoutValue {
  if (value === null) {
    return true;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isImmersiveLayoutValue);
  }
  if (typeof value === 'object') {
    return Object.values(value).every(isImmersiveLayoutValue);
  }
  return false;
}

// One traversal semantics for the whole editor: reads resolve through the patch engine's walker.
export function readPropValue(props: ImmersiveLayoutProps, path: string): ImmersiveLayoutValue | undefined {
  const value = getAtPath(props, splitPropPath(path));
  return isImmersiveLayoutValue(value) ? value : undefined;
}

// The one reader for a module's array group: a missing or non-array prop is an empty group, never
// a special case each caller has to remember.
export function effectiveModuleItems(module: ImmersiveLayoutModule, arrayPath: string): ImmersiveLayoutValue[] {
  const raw = readPropValue(module.props, arrayPath);
  return Array.isArray(raw) ? raw : [];
}

export function buildModulePropPath(moduleIndex: number, propPath: string): readonly (string | number)[] {
  return ['schema', 'modules', moduleIndex, 'props', ...splitPropPath(propPath)];
}

export interface ParsedModulePropPath {
  moduleId: string;
  propPath: string;
  arrayPath?: string;
  itemField?: string;
  itemIndex?: number;
}

/**
 * The LAST numeric segment splits the path into array / index / item field, so a child group's own
 * row index (`items.1.subitems.0.title`) stays inside the array path (`items.1.subitems`) instead
 * of being read as the item field. Registry group paths are otherwise static and number-free, so
 * this still resolves a single-level path (`items.1.label`) exactly as the first-numeric-segment
 * rule it replaces did (DR-59).
 */
export function parseModulePropPath(moduleId: string, propPath: string): ParsedModulePropPath {
  const segments = splitPropPath(propPath);
  let at = -1;
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if (typeof segments[index] === 'number') {
      at = index;
      break;
    }
  }
  if (at < 1 || at === segments.length - 1) {
    return { moduleId, propPath };
  }
  const itemIndex = segments[at];
  if (typeof itemIndex !== 'number') {
    return { moduleId, propPath };
  }
  return {
    arrayPath: segments.slice(0, at).join('.'),
    itemField: segments.slice(at + 1).join('.'),
    itemIndex,
    moduleId,
    propPath,
  };
}

// The overwhelming majority of prop values are primitives, and the identity check settles those
// without allocating anything. `JSON.stringify` is reserved for the objects and arrays it is
// actually needed for: the diff engine calls this once per descriptor field of every module —
// including every array row — on every keystroke.
export function valuesEqual(left: ImmersiveLayoutValue | undefined, right: ImmersiveLayoutValue | undefined): boolean {
  if (left === right) {
    return true;
  }
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}
