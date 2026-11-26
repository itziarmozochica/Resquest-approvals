import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseAdapter } from '@fz-original/app/core/base.adapter';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import { ApprovalItemCommentApiDto } from '../models/approval-api.model';
import { mapItemComment } from '../models/approval-item-comment.mapper';
import { ApprovalItemComment } from '../models/approval-item-comment.model';

@Injectable({ providedIn: 'root' })
export class ApprovalSingleItemCommentAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<ApprovalItemComment | null>, BaseResponse<ApprovalItemCommentApiDto>>
{
  fromApi(response: BaseResponse<ApprovalItemCommentApiDto>): BaseResponse<ApprovalItemComment | null> {
    const data = response?.data ? mapItemComment(response.data) : null;
    return new BaseResponse<ApprovalItemComment | null>(data, this.getError(response?.error));
  }
}
