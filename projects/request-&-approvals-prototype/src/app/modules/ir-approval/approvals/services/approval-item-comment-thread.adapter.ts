import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseAdapter } from '@fz-original/app/core/base.adapter';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import { ApprovalItemCommentsApiResponse } from '../models/approval-api.model';
import { mapItemComment } from '../models/approval-item-comment.mapper';
import { ApprovalItemComment } from '../models/approval-item-comment.model';

@Injectable({ providedIn: 'root' })
export class ApprovalItemCommentThreadAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<ApprovalItemComment[] | null>, BaseResponse<ApprovalItemCommentsApiResponse>>
{
  fromApi(response: BaseResponse<ApprovalItemCommentsApiResponse>): BaseResponse<ApprovalItemComment[] | null> {
    const comments = response?.data?.comments;
    const data = Array.isArray(comments) ? comments.map(mapItemComment) : null;
    return new BaseResponse<ApprovalItemComment[] | null>(data, this.getError(response?.error));
  }
}
