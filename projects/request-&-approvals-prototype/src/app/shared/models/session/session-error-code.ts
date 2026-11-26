export const soldOutSessionErrorCode = 803;

export function isSoldOutSessionError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const candidate = error as { code?: unknown; error?: { code?: unknown; errorCode?: unknown }; errorCode?: unknown };
  return [candidate.code, candidate.errorCode, candidate.error?.code, candidate.error?.errorCode].includes(soldOutSessionErrorCode);
}
