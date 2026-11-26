import type { ImmersiveLayoutValue } from '../models/immersive-layout-document.model';

export type LayoutPatchPath = readonly (string | number)[];

function isObject(value: unknown): value is Record<string, ImmersiveLayoutValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function shallowCloneRecord<T extends object>(value: T): T {
  return Array.isArray(value)
    ? ([...value] as T) // spread clone keeps the source array typed as T
    : ({ ...value } as T); // spread clone keeps the source object typed as T
}

export function getAtPath(value: unknown, path: LayoutPatchPath): unknown {
  return path.reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (Array.isArray(current) && typeof segment === 'number') {
      return current[segment];
    }
    if (isObject(current) && typeof segment === 'string') {
      return current[segment];
    }
    return undefined;
  }, value);
}

export function applyAtPath<T extends object>(source: T, path: LayoutPatchPath, nextValue: ImmersiveLayoutValue): T {
  if (path.length === 0) {
    return source;
  }

  const [head, ...tail] = path;
  if (tail.length === 0) {
    const record = source as Record<string | number, ImmersiveLayoutValue>; // T extends object; path head indexes a property slot
    if (record[head] === nextValue) {
      return source;
    }
    const cloned = shallowCloneRecord(source);
    (cloned as Record<string | number, ImmersiveLayoutValue>)[head] = nextValue; // cloned shares T's record shape
    return cloned;
  }

  const current = getAtPath(source, [head]);
  const child = isObject(current) || Array.isArray(current) ? current : typeof tail[0] === 'number' ? [] : {};
  const updatedChild = applyAtPath(child as object, tail, nextValue); // child is a layout array or record node
  if (updatedChild === child) {
    return source;
  }

  const cloned = shallowCloneRecord(source);
  (cloned as Record<string | number, ImmersiveLayoutValue>)[head] = updatedChild as ImmersiveLayoutValue; // recursive patch returns layout JSON
  return cloned;
}

export function omitAtPath<T extends object>(source: T, path: LayoutPatchPath): T {
  if (path.length === 0) {
    return source;
  }

  const [head, ...tail] = path;
  if (tail.length === 0) {
    const record = source as Record<string, ImmersiveLayoutValue>; // tail empty: source is a string-keyed layout record
    if (!(head in record)) {
      return source;
    }
    const cloned = shallowCloneRecord(source);
    delete (cloned as Record<string | number, ImmersiveLayoutValue>)[head]; // cloned shares T's record shape
    return cloned;
  }

  const current = getAtPath(source, [head]);
  if (!isObject(current) && !Array.isArray(current)) {
    return source;
  }

  const updatedChild = omitAtPath(current as object, tail); // current is a nested layout array or record node
  if (updatedChild === current) {
    return source;
  }

  const cloned = shallowCloneRecord(source);
  (cloned as Record<string | number, ImmersiveLayoutValue>)[head] = updatedChild as ImmersiveLayoutValue; // recursive omit returns layout JSON
  return cloned;
}
