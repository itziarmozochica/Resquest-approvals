import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../../shared/models/base-response';
import {
  PartnerTransportProviderDetailResponse,
  PartnerTransportProviderListDataDto,
  PartnerTransportProviderListResponse,
  PartnerTransportProviderSummaryDto,
} from '../models/partner-transport-provider-summary.dto';
import { PartnerTransportProviderSummary } from '../models/partner-transport-provider-summary.model';

@Injectable({
  providedIn: 'root',
})
export class PartnerTransportProviderAdapter
  implements AdapterInterface<BaseResponse<PartnerTransportProviderSummary[]>, PartnerTransportProviderListResponse>
{
  fromApi(response: PartnerTransportProviderListResponse): BaseResponse<PartnerTransportProviderSummary[]> {
    return new BaseResponse<PartnerTransportProviderSummary[]>(this.#getListData(response.data), this.#getError(response.error));
  }

  fromSingleApi(response: PartnerTransportProviderDetailResponse): BaseResponse<PartnerTransportProviderSummary> {
    return new BaseResponse<PartnerTransportProviderSummary>(this.#getSingleData(response.data), this.#getError(response.error));
  }

  #getError(data: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (data == null) {
      return null;
    }

    return { code: data.code, message: data.message };
  }

  #getListData(data: PartnerTransportProviderListDataDto | null): PartnerTransportProviderSummary[] {
    const partnerTransportProviders = data?.partner_transport_providers;
    if (partnerTransportProviders == null || partnerTransportProviders.length === 0) {
      return [];
    }

    return partnerTransportProviders.map(row => this.#toModel(row));
  }

  #getSingleData(data: PartnerTransportProviderSummaryDto | null): PartnerTransportProviderSummary | null {
    if (data == null) {
      return null;
    }

    return this.#toModel(data);
  }

  #toModel(data: PartnerTransportProviderSummaryDto): PartnerTransportProviderSummary {
    return {
      externalOrganizerId: data.external_organizer_id,
      id: data.id,
      transportProviderId: data.transport_provider_id,
      transportProviderName: data.transport_provider_name,
    };
  }
}
