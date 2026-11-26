import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

import { isString } from '@fz-original/app/app/utils/ts/ts.util';
import { Observable, of, throwError } from 'rxjs';

import { BaseErrorResponse, BaseResponse, HttpErrorResponseWithBaseError } from '../models/base-response';
import { CursorPaginationResponse } from '../models/cursor-pagination-response';
import { LinkPaginationResponse } from '../models/link-pagination-response';

/**
 * @todo refactor this file as simply functions
 * and do not type to `any`
 */

/**
 * Based on `static getErrorResponseError()`
 *
 * One can use this utility function to return a BaseErrorResponse as an observable:
 *
 * ```ts
 * catchError((error: HttpErrorResponseWithBaseError) => {
 *   return of (getHttpBaseErrorResponseError(error));
 * })
 * ```
 *
 * Or to throw a BaseErrorResponse as error:
 *
 * ```ts
 * catchError((error: HttpErrorResponseWithBaseError) => {
 *   throw getHttpBaseErrorResponseError(error);
 * })
 * ```
 */
export function getHttpBaseErrorResponseError(httpError: HttpErrorResponseWithBaseError): BaseErrorResponse {
  if (httpError == null) {
    throw new Error('Do not pass anything but a defined HttpErrorResponse to this function');
  }
  if (httpError.error == null) {
    return { code: httpError.status, message: `errors.${httpError.status}`, error: undefined };
  }
  const errorResponse: BaseErrorResponse | undefined = !isString(httpError.error.error) ? httpError.error.error : undefined;
  const code: string | number = errorResponse !== undefined ? errorResponse.code : httpError.status;
  const error: unknown = errorResponse !== undefined ? errorResponse.error : undefined;
  const message: string = isString(httpError.error.error)
    ? httpError.error.error
    : errorResponse !== undefined && errorResponse.message.length > 0
      ? errorResponse.message
      : `errors.${code}`;
  return { code, error, message };
}

export function getConflictMessage(httpError: HttpErrorResponse | null | undefined): string | null {
  if (httpError?.status !== HttpStatusCode.Conflict) {
    return null;
  }
  const body: unknown = httpError.error;
  const bodyError: unknown = (body as { error?: unknown } | null)?.error;
  const message: unknown = isString(bodyError) ? bodyError : (bodyError as { message?: unknown } | null)?.message;
  return isString(message) && message.length > 0 ? message : null;
}

export function withConflictMessage(httpError: HttpErrorResponse, error: BaseErrorResponse): BaseErrorResponse {
  const conflictMessage = getConflictMessage(httpError);
  return conflictMessage === null ? error : { ...error, userError: conflictMessage };
}

export class ErrorResponseUtils {
  private static readonly USER_MESSAGE_ERROR_FROM_API: string[] = ['32000101', '905', '36030101'];

  /**
   * @deprecated
   *
   * Errors should throw instead of being returned.
   * Use getErrorResponseError instead.
   *
   * @example catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error)))
   */
  static getErrorResponse<T>(error: BaseErrorResponse): Observable<BaseResponse<null>> {
    try {
      const errorResponse = ErrorResponseUtils.getErrorResponseError(error);
      return of(new BaseResponse<null>(null, errorResponse));
    } catch (e) {
      return of(
        new BaseResponse<null>(null, { code: 'UNKNOWN_ERROR', message: `👀 An unexpected error occurred in getErrorResponse: ${e}` }),
      );
    }
  }

  static getErrorResponseError(error: any): BaseErrorResponse {
    const isCustomError = error?.error?.error?.code;
    const isUserError = error?.error?.error?.message && this.USER_MESSAGE_ERROR_FROM_API.includes(error?.error?.error?.code?.toString());
    const message = isUserError ? error.error.error.message : isCustomError ? `errors.${error.error.error.code}` : 'errors.generic';
    const code = isCustomError ? error.error.error.code : error.status;
    return { code, message, error };
  }

  static getErrorResponseFromGroupError(error: any, group: string): BaseErrorResponse {
    const apiError = error?.error?.error;
    const userError: string | undefined = apiError?.user_error;
    const errorCode = error?.status_code || error?.error?.status_code || error?.error?.code || error?.error?.error?.code;
    const message = errorCode ? `errors.${group}.${errorCode}` : 'errors.generic';
    const code = error.status;
    return { code, message, error, errorCode, userError };
  }

  static getErrorResponseFromGroup(error: any, group: string): BaseResponse<null> {
    return new BaseResponse<null>(null, ErrorResponseUtils.getErrorResponseFromGroupError(error, group));
  }

  static getErrorForPaginatedResponse<T>(error: any): Observable<LinkPaginationResponse<null>> {
    const response = new LinkPaginationResponse<null>(null, null, ErrorResponseUtils.getErrorResponseError(error));
    return of(response);
  }

  static getErrorForCursorPaginatedResponse<T>(error: any): Observable<CursorPaginationResponse<null>> {
    const response = new CursorPaginationResponse<null>(null, null, ErrorResponseUtils.getErrorResponseError(error));
    return of(response);
  }

  static mapResponseErrorToException<T>(response: BaseResponse<T>): T {
    if (!response?.data) {
      throw response?.error;
    }
    return response?.data;
  }

  static checkResponseData<T>(response: BaseResponse<T>): Observable<BaseResponse<T>> {
    return response?.data ? of(response) : throwError(response);
  }
}
