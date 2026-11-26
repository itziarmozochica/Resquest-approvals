import type { BaseErrorResponse } from './base-response';

/**
 * Normalize a raw error payload into a `BaseErrorResponse` (or `null`).
 * Replaces the old `BaseResponse` class constructor's error handling — kept as a
 * pure function so consumers opt in without carrying a class.
 */
export function normalizeError(error: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
  if (!error) {
    return null;
  }
  return {
    code: error.code,
    error: error.error,
    errorCode: error.errorCode,
    message: error.message,
    ...(error.userError !== undefined && error.userError !== null && { userError: error.userError }),
  };
}
