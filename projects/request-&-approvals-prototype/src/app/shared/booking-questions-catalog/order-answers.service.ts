import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { BookingQuestionAnswer } from './models/booking-question-answer.model';
import { OrderAnswersInput } from './models/order-answers-input.model';
import { ApiGetOrderAnswersResponse, ApiModifyOrderAnswersResponse } from './models/order-answers.api';
import { OrderAnswersAdapter } from './order-answers.adapter';

@Injectable({
  providedIn: 'root',
})
export class OrderAnswersService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(OrderAnswersAdapter);

  getOrderAnswers(partnerId: number, orderId: number): Observable<BookingQuestionAnswer[]> {
    return this.#http.get<ApiGetOrderAnswersResponse>(this.#answersUrl(partnerId, orderId)).pipe(
      // Before the map on purpose: only an HTTP failure needs unwrapping, a body error already is one.
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      map(response => this.#adapter.fromApiList(this.#requireAnswers(response))),
    );
  }

  /** Upserts by question, ticket index and session type: an answer left out keeps its value, it is not cleared. */
  updateOrderAnswers(partnerId: number, orderId: number, when: QuestionWhen, input: OrderAnswersInput): Observable<number> {
    return this.#http
      .patch<ApiModifyOrderAnswersResponse>(this.#answersUrl(partnerId, orderId), this.#adapter.toApiModifyRequest(input), {
        params: new HttpParams().set('when', when),
      })
      .pipe(
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
        map(response => this.#requireData(response).order_id),
      );
  }

  #answersUrl(partnerId: number, orderId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/orders/${orderId}/booking-questions/answers/`;
  }

  /** A body that carries an error and no data is a failed read, not an order without answers. */
  #requireAnswers(response: ApiGetOrderAnswersResponse): ApiGetOrderAnswersResponse {
    if (!response.data) {
      throw response.error ?? new Error('Missing response data');
    }

    return response;
  }

  #requireData(response: ApiModifyOrderAnswersResponse): NonNullable<ApiModifyOrderAnswersResponse['data']> {
    const data = response.data;
    if (!data) {
      throw response.error ?? new Error('Missing response data');
    }

    return data;
  }
}
