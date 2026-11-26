import { Observable, of, throwError } from 'rxjs';

import { BaseResponse } from '../../../shared/models/base-response';

/**
 * Checks the response data and returns an observable.
 * If the response contains data, it returns an observable of the response.
 * Otherwise, it throws an error with the response.
 *
 * @template T - The type of the response data.
 * @param {BaseResponse<T>} response - The response to check.
 * @returns {Observable<BaseResponse<T>>} - An observable of the response if it contains data, or an error observable if it does not.
 */
export function checkResponseData<T>(response: BaseResponse<T>): Observable<BaseResponse<T>> {
  return response.data !== null ? of(response) : throwError(() => response);
}
