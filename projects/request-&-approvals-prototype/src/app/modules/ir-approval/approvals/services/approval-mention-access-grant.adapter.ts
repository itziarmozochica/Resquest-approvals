import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseAdapter } from '@fz-original/app/core/base.adapter';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import { ApprovalItemCommentMentionAccessGrantApiDto } from '../models/approval-api.model';
import { mapMentionAccessGrant } from '../models/approval-item-comment.mapper';
import { ApprovalMentionAccessGrant } from '../models/approval-item-comment.model';

@Injectable({ providedIn: 'root' })
export class ApprovalMentionAccessGrantAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<ApprovalMentionAccessGrant | null>, BaseResponse<ApprovalItemCommentMentionAccessGrantApiDto>>
{
  fromApi(response: BaseResponse<ApprovalItemCommentMentionAccessGrantApiDto>): BaseResponse<ApprovalMentionAccessGrant | null> {
    const data = response?.data ? mapMentionAccessGrant(response.data) : null;
    return new BaseResponse<ApprovalMentionAccessGrant | null>(data, this.getError(response?.error));
  }
}
