import { HttpClient, HttpContext, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SKIP_RETRY_INTERCEPTOR } from '../../../interceptors/skip-retry.token';
import { BaseErrorResponse, BaseResponse, BaseResponseDTO } from '../../../models/base-response';
import { CustomerNote, CustomerNoteChanges } from '../../../models/customer-note/customer-note.model';
import { ErrorResponseUtils } from '../../../utils/error-response.utils';
import { toCustomerNote, toCustomerNoteRequestDto } from '../../order/order-customer-notes/adapters/customer-note.adapter';
import { CreatedCustomerNoteDataDto, CustomerNotesDataDto } from '../../order/order-customer-notes/dtos/customer-note.dto';

@Injectable({ providedIn: 'root' })
export class ReservationCustomerNotesService {
  static readonly reservationPaidMessageKey = 'boxOffice.order.notes.customerNoteReservationPaid';
  readonly #http = inject(HttpClient);

  create(partnerId: number, reservationId: string, changes: CustomerNoteChanges): Observable<string> {
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);
    return this.#http
      .post<
        BaseResponseDTO<CreatedCustomerNoteDataDto>
      >(this.#url(partnerId, reservationId), toCustomerNoteRequestDto(changes), { context })
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

  delete(partnerId: number, reservationId: string, noteId: string): Observable<void> {
    return this.#http.delete<void>(this.#url(partnerId, reservationId, noteId)).pipe(catchError(error => this.#rethrow(error)));
  }

  list(partnerId: number, reservationId: string): Observable<CustomerNote[]> {
    return this.#http.get<BaseResponse<CustomerNotesDataDto>>(this.#url(partnerId, reservationId)).pipe(
      map(response => (response.data?.notes ?? []).map(toCustomerNote)),
      catchError(error => this.#rethrow(error)),
    );
  }

  update(partnerId: number, reservationId: string, noteId: string, changes: CustomerNoteChanges): Observable<void> {
    return this.#http.put<unknown>(this.#url(partnerId, reservationId, noteId), toCustomerNoteRequestDto(changes)).pipe(
      map((): void => undefined),
      catchError(error => this.#rethrow(error)),
    );
  }

  #rethrow(error: unknown): Observable<never> {
    if (!(error instanceof HttpErrorResponse)) {
      return throwError((): BaseErrorResponse => ({ code: 'UNKNOWN_ERROR', error, message: 'errors.generic' }));
    }
    const { code } = ErrorResponseUtils.getErrorResponseError(error);
    const message = error.status === HttpStatusCode.Conflict ? ReservationCustomerNotesService.reservationPaidMessageKey : 'errors.generic';
    return throwError((): BaseErrorResponse => ({ code, error, message }));
  }

  #url(partnerId: number, reservationId: string, noteId?: string): string {
    const notesUrl = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/reservations/${reservationId}/customer-notes/`;
    return noteId ? `${notesUrl}${noteId}/` : notesUrl;
  }
}
