import { BaseResponseDTO } from '../../../../shared/models/base-response';

export interface PartnerTransportProviderSummaryDto {
  external_organizer_id: string;
  id: number;
  transport_provider_id: number;
  transport_provider_name: string;
}

export interface PartnerTransportProviderListDataDto {
  partner_transport_providers: PartnerTransportProviderSummaryDto[];
}

export interface PartnerTransportProviderListResponse extends BaseResponseDTO<PartnerTransportProviderListDataDto | null> {}

export interface PartnerTransportProviderDetailResponse extends BaseResponseDTO<PartnerTransportProviderSummaryDto | null> {}
