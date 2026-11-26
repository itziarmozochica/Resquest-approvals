/**
 * Deep-ish clone utility safe for simple POJOs used in schedule components.
 */
export function safeClone<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}
