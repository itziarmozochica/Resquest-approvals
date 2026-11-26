import type { HttpErrorResponse } from '@angular/common/http';

export interface BaseErrorResponse<T extends number | string = number | string> {
  code: T;
  message: string;
  error?: unknown;
  errorCode?: number;
  userError?: string | null;
}

/**
 * Plain HTTP response envelope. Interface, never a class — error normalization
 * lives in `normalizeError()` (see `./normalize-error`), not in a constructor.
 */
export interface BaseResponse<T, E = BaseErrorResponse> {
  data: T | null;
  error: E | null;
}

export interface HttpErrorResponseWithBaseError extends HttpErrorResponse {
  error: BaseResponse<null> | null;
}
