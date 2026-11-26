import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SKIP_RETRY_INTERCEPTOR } from '../../../interceptors/skip-retry.token';
import { BaseErrorResponse, BaseResponse, BaseResponseDTO } from '../../../models/base-response';
import { CustomerNote, CustomerNoteChanges } from '../../../models/customer-note/customer-note.model';
import { ErrorResponseUtils } from '../../../utils/error-response.utils';
import { toCustomerNote, toCustomerNoteRequestDto } from './adapters/customer-note.adapter';
import { CreatedCustomerNoteDataDto, CustomerNotesDataDto } from './dtos/customer-note.dto';

@Injectable({ providedIn: 'root' })
export class OrderCustomerNotesService {
  readonly #http = inject(HttpClient);

  create(partnerId: number, orderId: number, changes: CustomerNoteChanges): Observable<string> {
    // A replayed create can duplicate the order's one customer note.
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);
    return this.#http
      .post<BaseResponseDTO<CreatedCustomerNoteDataDto>>(this.#url(partnerId, orderId), toCustomerNoteRequestDto(changes), { context })
      .pipe(
        map(response => {
          if (!response.data) {
            throw response.error ?? new Error('Customer note create answered without data');
          }
          return response.data.id;
        }),
        catchError(error => this.#rethrow(error)),
      );
  }

  delete(partnerId: number, orderId: number, noteId: string): Observable<void> {
    return this.#http.delete<void>(this.#url(partnerId, orderId, noteId)).pipe(catchError(error => this.#rethrow(error)));
  }

  list(partnerId: number, orderId: number): Observable<CustomerNote[]> {
    return this.#http.get<BaseResponse<CustomerNotesDataDto>>(this.#url(partnerId, orderId)).pipe(
      map(response => (response.data?.notes ?? []).map(toCustomerNote)),
      catchError(error => this.#rethrow(error)),
    );
  }

  update(partnerId: number, orderId: number, noteId: string, changes: CustomerNoteChanges): Observable<void> {
    return this.#http.put<unknown>(this.#url(partnerId, orderId, noteId), toCustomerNoteRequestDto(changes)).pipe(
      map((): void => undefined),
      catchError(error => this.#rethrow(error)),
    );
  }

  #rethrow(error: unknown): Observable<never> {
    const code = error instanceof HttpErrorResponse ? ErrorResponseUtils.getErrorResponseError(error).code : 'UNKNOWN_ERROR';
    return throwError((): BaseErrorResponse => ({ code, error, message: 'errors.generic' }));
  }

  #url(partnerId: number, orderId: number, noteId?: string): string {
    const notesUrl = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/orders/${orderId}/customer-notes/`;
    return noteId ? `${notesUrl}${noteId}/` : notesUrl;
  }
}
