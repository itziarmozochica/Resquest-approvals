import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseAdapter } from '@fz-original/app/core/base.adapter';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import { InformationRequestApiDto } from '../models/information-request-api.model';
import { mapInformationRequestDtoToInformationRequest } from '../models/information-request.mapper';
import { InformationRequest } from '../models/information-request.model';

@Injectable({ providedIn: 'root' })
export class InformationRequestAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<InformationRequest | null>, BaseResponse<InformationRequestApiDto>>
{
  fromApi(response: BaseResponse<InformationRequestApiDto>): BaseResponse<InformationRequest | null> {
    const data = response?.data ? mapInformationRequestDtoToInformationRequest(response.data) : null;
    return new BaseResponse<InformationRequest | null>(data, this.getError(response?.error));
  }
}
