import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../models/base-response';
import { SurveyReply, SurveyReplyData } from './models/survey-reply.model';

@Injectable({
  providedIn: 'root',
})
export class CreateSurveyReplyAdapter implements AdapterInterface<BaseResponse<SurveyReply>> {
  fromApi(response: BaseResponse<SurveyReplyData>): BaseResponse<SurveyReply> {
    return new BaseResponse<SurveyReply>(this.getData(response.data), response.error);
  }

  private getData(data: SurveyReplyData | null | undefined): SurveyReply | null {
    if (data == null) {
      return null;
    }
    return new SurveyReply(data.id, data.external_id, data.reply_at, data.next_scheduled_reply_at);
  }
}
