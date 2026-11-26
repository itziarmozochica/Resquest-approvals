import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseAdapter } from '@fz-original/app/core/base.adapter';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import { InformationRequestApiDto, InformationRequestsListApiResponse } from '../models/information-request-api.model';
import { mapInformationRequestDtoToInformationRequest } from '../models/information-request.mapper';
import { InformationRequest } from '../models/information-request.model';

@Injectable({ providedIn: 'root' })
export class InformationRequestsAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<InformationRequest[]>, BaseResponse<InformationRequestsListApiResponse>>
{
  fromApi(response: BaseResponse<InformationRequestsListApiResponse>): BaseResponse<InformationRequest[]> {
    const data = response?.data?.information_requests
      ? response.data.information_requests.map((dto: InformationRequestApiDto) => mapInformationRequestDtoToInformationRequest(dto))
      : null;
    return new BaseResponse<InformationRequest[]>(data, this.getError(response?.error));
  }
}
