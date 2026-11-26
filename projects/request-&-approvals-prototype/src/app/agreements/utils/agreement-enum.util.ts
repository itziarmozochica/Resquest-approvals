export function parseEnum<T extends Record<string, string>>(values: T, value: string, field: string): T[keyof T] {
  const member = Object.values(values).find((candidate): candidate is T[keyof T] => candidate === value);
  if (member === undefined) {
    throw new Error(`Unsupported agreements ${field} received from the API: "${value}"`);
  }
  return member;
}
