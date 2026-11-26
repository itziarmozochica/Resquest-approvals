/**
 * Extracts the service account a user must be granted access to from an access-denied response error.
 *
 * The structured `account` lives in the raw backend body, nested under the mapped error built by
 * `ErrorResponseUtils.getErrorResponse`: `responseError.error` (HttpErrorResponse) → `.error` (body)
 * → `.error` (body error) → `account`. Returns null when absent (callers fall back to a generic message).
 */
export function accessDeniedAccount(responseError: unknown): string | null {
  const bodyError = (responseError as { error?: { error?: { error?: { account?: unknown } } } } | null | undefined)?.error?.error?.error;
  return typeof bodyError?.account === 'string' ? bodyError.account : null;
}
