export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

export type KeysFilteredByType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T];

export function fromEntries(entries: [key: string | number, value: unknown][]): { [key: string]: unknown; [key: number]: unknown } {
  return entries.reduce(
    (prev: { [key: string]: unknown; [key: number]: unknown }, [key, value]) => {
      prev[key] = value;
      return prev;
    },
    {} as { [key: string]: unknown; [key: number]: unknown },
  );
}

export function removeEmptyKeys<T extends object>(value: T): Partial<T> {
  return fromEntries(Object.entries(value).filter(([, value]) => value !== undefined && value !== null)) as unknown as Partial<T>;
}

export function flatArray<T>(arr: Array<Array<T>>): Array<T> {
  return arr.reduce((prev, curr) => [...prev, ...curr], []);
}

export function getPickedPropertyObjectIfDefined<T, U extends keyof T>(
  value: PropType<T, U>,
  property: U,
): Pick<T, U> | Record<string, never> {
  if (value === null || value === undefined) {
    return {};
  }

  const output: Partial<Pick<T, U>> = {};
  output[property] = value;
  return output as Pick<T, U>;
}
