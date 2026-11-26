import { HttpErrorResponse } from '@angular/common/http';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { MonoTypeOperatorFunction, of, OperatorFunction } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Every mutation answers with either a message the UI never shows or a bodyless 204.
export function toEmptySuccess(): OperatorFunction<unknown, BaseResponse<null>> {
  return map(() => new BaseResponse<null>(null, null));
}

// `code` carries the HTTP status, not the envelope's B2B code: the status is what picks the message.
export function toErrorResponse<T>(): MonoTypeOperatorFunction<BaseResponse<T>> {
  return catchError((error: HttpErrorResponse) => of(new BaseResponse<T>(null, { code: error.status, error, message: 'errors.generic' })));
}
