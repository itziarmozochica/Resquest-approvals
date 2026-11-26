import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { map, Observable, of, OperatorFunction, throwError } from 'rxjs';

/**
 * Pure adapters over the `BaseResponse<T>` envelope every root service returns.
 *
 * `TicketingCoreService` exposes domain models, never envelopes; strategy code that still needs
 * the raw envelope (the shapes legacy `checkResponseData` / `createOrUpdateCartResponse` produce)
 * uses the `*Response` variants explicitly.
 */

/** An envelope without `data` is an error. */
export const requireResponseData = <T>(response: BaseResponse<T>): Observable<BaseResponse<T>> =>
  response?.data ? of(response) : throwError(() => response);

/**
 * Unwraps the envelope's `data`, or throws its `error`.
 *
 * Accepts the nullable envelope root services actually declare (`BaseResponse<T | null>`) and
 * narrows to `T`, so callers never have to widen their own domain types.
 */
export const unwrapResponseData = <T>(response: BaseResponse<T | null>): T => {
  if (response?.data) {
    return response.data;
  }
  throw response?.error ?? new Error('Unknown error');
};

/** Operator form of {@link unwrapResponseData}. */
export const unwrapData = <T>(): OperatorFunction<BaseResponse<T | null>, T> =>
  map((response: BaseResponse<T | null>) => unwrapResponseData(response));

/** Unwraps to `null` instead of throwing — for endpoints where "no data" is a valid outcome. */
export const unwrapDataOrNull = <T>(): OperatorFunction<BaseResponse<T | null>, T | null> =>
  map((response: BaseResponse<T | null>) => response?.data ?? null);
