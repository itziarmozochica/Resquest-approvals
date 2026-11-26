import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../models/base-response';
import { ErrorResponseUtils } from '../../../utils/error-response.utils';
import { CreateSurveyReplyAdapter } from './create-survey-reply.adapter';
import { GetSurveyRepliesAdapter } from './get-survey-replies.adapter';
import { SurveyReply, SurveyReplyData } from './models/survey-reply.model';

@Injectable({
  providedIn: 'root',
})
export class SurveyReplyService {
  constructor(
    private httpClient: HttpClient,
    private getSurveyRepliesAdapter: GetSurveyRepliesAdapter,
    private createSurveyReplyAdapter: CreateSurveyReplyAdapter,
  ) {}

  getSurveyReplies(partnerId: number, onlyLastReply?: boolean): Observable<BaseResponse<SurveyReply[] | null>> {
    const path = `${this.getSurveyReplyUrl(partnerId)}`;
    const options: { params: HttpParams } = { params: new HttpParams({ fromObject: { only_last_reply: !!onlyLastReply } }) };
    return this.httpClient.get<BaseResponse<SurveyReplyData[]>>(path, options).pipe(
      switchMap((result: BaseResponse<SurveyReplyData[]>) => of(this.getSurveyRepliesAdapter.fromApi(result))),
      catchError(error => ErrorResponseUtils.getErrorResponse<SurveyReplyData>(error)),
    );
  }

  createSurveyReply(
    partnerId: number,
    userId: number,
    externalSurveyId: string,
    recurringPeriod?: number,
  ): Observable<BaseResponse<SurveyReply | null>> {
    const path = `${this.getSurveyReplyUrl(partnerId)}`;
    return this.httpClient
      .post<
        BaseResponse<SurveyReplyData>
      >(path, { user_id: userId, external_id: externalSurveyId, recurring_period: recurringPeriod ? recurringPeriod : null })
      .pipe(
        switchMap((result: BaseResponse<SurveyReplyData>) => of(this.createSurveyReplyAdapter.fromApi(result))),
        catchError(error => ErrorResponseUtils.getErrorResponse<SurveyReplyData>(error)),
      );
  }

  private getSurveyReplyUrl(partnerId: number) {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/survey-replies`;
  }
}
