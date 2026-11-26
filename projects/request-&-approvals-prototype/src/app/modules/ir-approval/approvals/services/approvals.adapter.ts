import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseAdapter } from '@fz-original/app/core/base.adapter';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import { ApprovalApiDto, ApprovalsListApiResponse } from '../models/approval-api.model';
import { mapApprovalDtoToApproval } from '../models/approval.mapper';
import { Approval } from '../models/approval.model';

@Injectable({ providedIn: 'root' })
export class ApprovalsAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<Approval[]>, BaseResponse<ApprovalsListApiResponse>>
{
  fromApi(response: BaseResponse<ApprovalsListApiResponse>): BaseResponse<Approval[]> {
    const data = response?.data?.approvals ? response.data.approvals.map((dto: ApprovalApiDto) => mapApprovalDtoToApproval(dto)) : null;
    return new BaseResponse<Approval[]>(data, this.getError(response?.error));
  }
}
