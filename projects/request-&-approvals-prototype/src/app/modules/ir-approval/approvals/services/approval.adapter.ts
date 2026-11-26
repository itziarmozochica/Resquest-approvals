import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseAdapter } from '@fz-original/app/core/base.adapter';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import { ApprovalApiDto } from '../models/approval-api.model';
import { mapApprovalDtoToApproval } from '../models/approval.mapper';
import { Approval } from '../models/approval.model';

@Injectable({ providedIn: 'root' })
export class ApprovalAdapter extends BaseAdapter implements AdapterInterface<BaseResponse<Approval | null>, BaseResponse<ApprovalApiDto>> {
  fromApi(response: BaseResponse<ApprovalApiDto>): BaseResponse<Approval | null> {
    const data = response?.data ? mapApprovalDtoToApproval(response.data) : null;
    return new BaseResponse<Approval | null>(data, this.getError(response?.error));
  }
}
