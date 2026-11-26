import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { mapAddOnConfiguration } from '../../../modules/sessions/shared/models/price-list-item.model';
import { PriceProductTaxRateDtoParser } from '../../../modules/sessions/shared/services/price-list/price-product-tax-rate-dto-parser';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { LinkPaginationResponse } from '../../models/link-pagination-response';
import {
  GetSessionTypeSummariesDTO,
  SessionTypeGroupSummary,
  SessionTypeGroupSummaryDTO,
  SessionTypeSummary,
  SessionTypeSummaryDTO,
  SessionTypeSummaryWithTaxData,
} from './session-type.model';

type BaseResponseDTO<T> = Pick<BaseResponse<T>, 'data' | 'error'>;

export type SessionTypeSummariesListDTO = BaseResponseDTO<GetSessionTypeSummariesDTO>;
export type SessionTypeSummariesListResponseDTO = HttpResponse<SessionTypeSummariesListDTO>;

export type SessionTypeSummariesListResponseData = Array<SessionTypeSummary> | Array<SessionTypeSummaryWithTaxData>;
export type SessionTypeSummariesListResponse = LinkPaginationResponse<SessionTypeSummariesListResponseData>;

@Injectable({
  providedIn: 'root',
})
export class SessionTypesListAdapter implements AdapterInterface<SessionTypeSummariesListResponse, SessionTypeSummariesListResponseDTO> {
  constructor(private productTaxRateParser: PriceProductTaxRateDtoParser) {}

  fromApi(response: SessionTypeSummariesListResponseDTO): SessionTypeSummariesListResponse {
    const body = response.body;
    return new LinkPaginationResponse<SessionTypeSummariesListResponseData>(
      response.headers.get('Link'),
      this.getData(body?.data?.session_types || []),
      this.getError(body?.error),
    );
  }

  private getData(sessionTypeSummariesDTOs: Array<SessionTypeSummaryDTO>): SessionTypeSummariesListResponseData {
    return sessionTypeSummariesDTOs.map(dto => this.parseSessionTypeSumaryDTO(dto));
  }

  private parseSessionTypeSumaryDTO(dto: SessionTypeSummaryDTO): SessionTypeSummary | SessionTypeSummaryWithTaxData {
    return {
      id: dto.id,
      label: dto.label,
      archivedAt: dto.archived_at ? new Date(dto.archived_at) : null,
      isAddOn: dto.is_add_on,
      isShopProduct: dto.is_shop_product,
      hasDetails: dto.has_details,
      hasInstructions: dto.has_instructions,
      minimumTickets: dto.allowed_min_tickets,
      maximumTickets: dto.allowed_max_tickets,
      groups: dto.groups.map(group => this.adaptGroup(group)),
      ...('product_tax_rate' in dto && dto.product_tax_rate
        ? { productTaxRate: this.productTaxRateParser.parse(dto.product_tax_rate) }
        : {}),
      ...('default_capacity' in dto ? { defaultCapacity: dto.default_capacity } : {}),
      ...('must_use_tax_base' in dto ? { mustUseTaxBase: dto.must_use_tax_base } : {}),
      ...('tax_product_rate' in dto ? { taxProductRate: dto.tax_product_rate } : {}),
      ...('tax_surcharge_rate' in dto ? { taxSurchargeRate: dto.tax_surcharge_rate } : {}),
      ...('packed_session_types' in dto ? { packedSessionTypes: dto.packed_session_types } : {}),
      addOnConfiguration: mapAddOnConfiguration(dto.add_on_configuration),
    };
  }

  private adaptGroup(sessionTypeGroupSummariesDTOs: SessionTypeGroupSummaryDTO): SessionTypeGroupSummary {
    return {
      id: sessionTypeGroupSummariesDTOs.id,
      name: sessionTypeGroupSummariesDTOs.name,
      isAssetBased: sessionTypeGroupSummariesDTOs.is_asset_based,
    };
  }

  private getError(data: BaseErrorResponse): BaseErrorResponse | null {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}
