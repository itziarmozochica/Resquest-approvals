import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MainPlanQuestionsAdapter } from './main-plan-questions.adapter';
import { MainPlanQuestionInput } from './models/main-plan-question-input.model';
import { MainPlanQuestion } from './models/main-plan-question.model';
import { MainPlanQuestionsQuery } from './models/main-plan-questions-query.model';
import { ApiFindMainPlanQuestionsResponse, ApiMainPlanQuestionMutationResponse } from './models/main-plan-questions.api';

@Injectable({
  providedIn: 'root',
})
export class MainPlanQuestionsService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(MainPlanQuestionsAdapter);

  assignQuestion(partnerId: number, mainPlanId: number, bookingQuestionId: string, input: MainPlanQuestionInput): Observable<number> {
    return this.#http
      .post<ApiMainPlanQuestionMutationResponse>(
        this.#assignUrl(partnerId, mainPlanId, bookingQuestionId),
        this.#adapter.toApiRequest(input),
      )
      .pipe(
        map(response => this.#mutationId(response)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  deleteMainPlanQuestion(partnerId: number, mainPlanId: number, mainPlanQuestionId: number): Observable<void> {
    return this.#http
      .delete<void>(this.#questionUrl(partnerId, mainPlanId, mainPlanQuestionId))
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  getMainPlanQuestions(partnerId: number, mainPlanId: number, query: MainPlanQuestionsQuery = {}): Observable<MainPlanQuestion[]> {
    return this.#http
      .get<ApiFindMainPlanQuestionsResponse>(this.#baseUrl(partnerId, mainPlanId), { params: this.#buildParams(query) })
      .pipe(
        map(response => this.#adapter.fromApiList(response)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  updateMainPlanQuestion(
    partnerId: number,
    mainPlanId: number,
    mainPlanQuestionId: number,
    input: MainPlanQuestionInput,
  ): Observable<number> {
    return this.#http
      .put<ApiMainPlanQuestionMutationResponse>(
        this.#questionUrl(partnerId, mainPlanId, mainPlanQuestionId),
        this.#adapter.toApiRequest(input),
      )
      .pipe(
        map(response => this.#mutationId(response)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  #assignUrl(partnerId: number, mainPlanId: number, bookingQuestionId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${mainPlanId}/booking-questions/${bookingQuestionId}/`;
  }

  #baseUrl(partnerId: number, mainPlanId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${mainPlanId}/main-plan-questions/`;
  }

  #buildParams(query: MainPlanQuestionsQuery): HttpParams {
    let params = new HttpParams();

    for (const sessionTypeId of query.sessionTypeIds ?? []) {
      params = params.append('session_type_ids', sessionTypeId);
    }

    if (query.channelId != null && query.channelId !== '') {
      params = params.set('channel_id', query.channelId);
    }

    return params;
  }

  #mutationId(response: ApiMainPlanQuestionMutationResponse): number {
    const data = response.data;
    if (!data) {
      throw new Error('Missing response data');
    }

    return data.main_plan_question_id;
  }

  #questionUrl(partnerId: number, mainPlanId: number, mainPlanQuestionId: number): string {
    return `${this.#baseUrl(partnerId, mainPlanId)}${mainPlanQuestionId}/`;
  }
}
