import { HttpClient, HttpContext, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import type { BaseErrorResponse, BaseResponse, BaseResponseDTO } from '@fz-original/app/shared/models/base-response';
import type { CustomerNote, CustomerNoteChanges } from '@fz-original/app/shared/models/customer-note/customer-note.model';
import {
  toCustomerNote,
  toCustomerNoteRequestDto,
} from '@fz-original/app/shared/services/order/order-customer-notes/adapters/customer-note.adapter';
import type {
  CreatedCustomerNoteDataDto,
  CustomerNoteDto,
  CustomerNotesDataDto,
} from '@fz-original/app/shared/services/order/order-customer-notes/dtos/customer-note.dto';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * The customer notes stored on a quote. A new quote takes its notes in the create-quote request itself
 * (`LeadsService.createQuote`), so it is stored with them in one request; an existing quote's notes
 * change through these endpoints. They answer the reservation and
 * order customer-note schema, so this reuses their DTOs and adapter. Writes answer 409 once the quote
 * was converted or discarded, and that error carries `quoteLockedMessageKey` so the panel can say why.
 */
@Injectable({
  providedIn: 'root',
})
export class LeadQuoteCustomerNotesService {
  static readonly quoteLockedMessageKey = 'boxOffice.order.notes.customerNoteQuoteLocked';
  readonly #http = inject(HttpClient);

  /** A create is not idempotent, so it is never retried: a retried POST would store the note twice. */
  create(partnerId: number, leadId: string, quoteId: string, changes: CustomerNoteChanges): Observable<string> {
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);
    return this.#http
      .post<
        BaseResponseDTO<CreatedCustomerNoteDataDto>
      >(this.#url(partnerId, leadId, quoteId), toCustomerNoteRequestDto(changes), { context })
      .pipe(
        map(response => {
          if (!response.data) {
            throw response.error ?? new Error('Quote customer note create answered without data');
          }
          return response.data.id;
        }),
        catchError(error => this.#rethrow(error)),
      );
  }

  delete(partnerId: number, leadId: string, quoteId: string, noteId: string): Observable<void> {
    return this.#http.delete<void>(this.#url(partnerId, leadId, quoteId, noteId)).pipe(catchError(error => this.#rethrow(error)));
  }

  list(partnerId: number, leadId: string, quoteId: string): Observable<CustomerNote[]> {
    return this.#http.get<BaseResponse<CustomerNotesDataDto>>(this.#url(partnerId, leadId, quoteId)).pipe(
      map(response => (response.data?.notes ?? []).map((dto: CustomerNoteDto) => toCustomerNote(dto))),
      catchError(error => this.#rethrow(error)),
    );
  }

  update(partnerId: number, leadId: string, quoteId: string, noteId: string, changes: CustomerNoteChanges): Observable<void> {
    return this.#http.put<unknown>(this.#url(partnerId, leadId, quoteId, noteId), toCustomerNoteRequestDto(changes)).pipe(
      map((): void => undefined),
      catchError(error => this.#rethrow(error)),
    );
  }

  #rethrow(error: unknown): Observable<never> {
    const errorResponse = ErrorResponseUtils.getErrorResponseError(error);
    const isQuoteLocked = error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict;
    return throwError(
      (): BaseErrorResponse =>
        isQuoteLocked ? { ...errorResponse, message: LeadQuoteCustomerNotesService.quoteLockedMessageKey } : errorResponse,
    );
  }

  /** The ids come from the route or the backend, so they are encoded before going into the path. */
  #url(partnerId: number, leadId: string, quoteId: string, noteId?: string): string {
    const notesUrl = `${environment.apiBaseUrl}/3.0/partners/${encodeURIComponent(partnerId)}/leads/${encodeURIComponent(leadId)}/quotes/${encodeURIComponent(quoteId)}/customer-notes/`;
    return noteId ? `${notesUrl}${encodeURIComponent(noteId)}/` : notesUrl;
  }
}
