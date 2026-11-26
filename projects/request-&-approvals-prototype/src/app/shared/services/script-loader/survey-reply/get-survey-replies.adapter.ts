import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../models/base-response';
import { SurveyReply, SurveyReplyData } from './models/survey-reply.model';

@Injectable({
  providedIn: 'root',
})
export class GetSurveyRepliesAdapter implements AdapterInterface<BaseResponse<SurveyReply[]>> {
  fromApi(response: BaseResponse<SurveyReplyData[]>): BaseResponse<SurveyReply[]> {
    return new BaseResponse<SurveyReply[]>(this.getData(response.data), response.error);
  }

  private getData(data: SurveyReplyData[] | null | undefined): SurveyReply[] | null {
    if (data == null) {
      return null;
    }

    return data.map(
      (survey: SurveyReplyData) => new SurveyReply(survey.id, survey.external_id, survey.reply_at, survey.next_scheduled_reply_at),
    );
  }
}
