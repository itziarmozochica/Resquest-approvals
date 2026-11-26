import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { BookingQuestionsCatalogAdapter } from './booking-questions-catalog.adapter';
import {
  ApiBookingQuestionMutationResponse,
  ApiFindBookingQuestionsResponse,
  ApiGetAllowedCapabilitiesResponse,
  ApiGetBookingQuestionResponse,
} from './models/booking-questions-catalog.api';
import { CustomerQuestionInput } from './models/customer-question-input.model';
import { CustomerQuestion, CustomerQuestionCapabilities, CustomerQuestionsPage } from './models/customer-question.model';
import { CustomerQuestionsCatalogQuery } from './models/customer-questions-catalog-query.model';

@Injectable({
  providedIn: 'root',
})
export class BookingQuestionsCatalogService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(BookingQuestionsCatalogAdapter);

  createQuestion(partnerId: number, question: CustomerQuestionInput): Observable<string> {
    return this.#http.post<ApiBookingQuestionMutationResponse>(this.#baseUrl(partnerId), this.#adapter.toApiCreateRequest(question)).pipe(
      map(response => this.#mutationId(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  deleteQuestion(partnerId: number, questionId: string): Observable<void> {
    return this.#http
      .delete<void>(this.#questionUrl(partnerId, questionId))
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  getAllowedCapabilities(partnerId: number, questionId: string): Observable<CustomerQuestionCapabilities> {
    return this.#http.get<ApiGetAllowedCapabilitiesResponse>(this.#allowedCapabilitiesUrl(partnerId, questionId)).pipe(
      map(response => this.#adapter.fromApiCapabilities(this.#requireData(response.data))),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getCatalog(partnerId: number, query: CustomerQuestionsCatalogQuery): Observable<CustomerQuestionsPage> {
    return this.#http.get<ApiFindBookingQuestionsResponse>(this.#baseUrl(partnerId), { params: this.#buildParams(query) }).pipe(
      map(response => this.#adapter.fromApiList(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getQuestion(partnerId: number, questionId: string): Observable<CustomerQuestion> {
    return this.#http.get<ApiGetBookingQuestionResponse>(this.#questionUrl(partnerId, questionId)).pipe(
      map(response => this.#adapter.fromApiItem(this.#requireData(response.data))),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  updateAllowedCapabilities(partnerId: number, questionId: string, capabilities: CustomerQuestionCapabilities): Observable<string> {
    return this.#http
      .put<ApiBookingQuestionMutationResponse>(
        this.#allowedCapabilitiesUrl(partnerId, questionId),
        this.#adapter.toApiCapabilities(capabilities),
      )
      .pipe(
        map(response => this.#mutationId(response)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  updateQuestion(partnerId: number, questionId: string, question: CustomerQuestionInput): Observable<string> {
    return this.#http
      .put<ApiBookingQuestionMutationResponse>(this.#questionUrl(partnerId, questionId), this.#adapter.toApiUpdateRequest(question))
      .pipe(
        map(response => this.#mutationId(response)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  #allowedCapabilitiesUrl(partnerId: number, questionId: string): string {
    return `${this.#questionUrl(partnerId, questionId)}allowed-capabilities/`;
  }

  #baseUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/booking-questions/`;
  }

  #buildParams(query: CustomerQuestionsCatalogQuery): HttpParams {
    let params = new HttpParams().set('page', query.page).set('page_size', query.pageSize);

    if (query.label) {
      params = params.set('label', query.label);
    }

    if (query.questionType) {
      params = params.set('question_type', query.questionType);
    }

    if (query.catalogCategories?.length) {
      for (const category of query.catalogCategories) {
        params = params.append('catalog_categories', category);
      }
    }

    if (query.assignableOnly) {
      params = params.set('assignable_only', true);
    }

    return params;
  }

  #mutationId(response: ApiBookingQuestionMutationResponse): string {
    return this.#requireData(response.data).booking_question_id;
  }

  #questionUrl(partnerId: number, questionId: string): string {
    return `${this.#baseUrl(partnerId)}${questionId}/`;
  }

  #requireData<T>(data: T | null): T {
    if (!data) {
      throw new Error('Missing response data');
    }

    return data;
  }
}
