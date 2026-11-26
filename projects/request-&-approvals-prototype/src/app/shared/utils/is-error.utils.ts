export function isErrorLike(value: unknown): value is Error {
  return value !== null && typeof value === 'object' && 'message' in value && typeof (value as Error).message === 'string';
}
