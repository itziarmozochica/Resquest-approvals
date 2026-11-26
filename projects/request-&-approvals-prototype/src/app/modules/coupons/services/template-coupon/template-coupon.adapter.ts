import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import moment from 'moment';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../../shared/models/base-response';
import { LinkPaginationResponse } from '../../../../shared/models/link-pagination-response';
import { TemplateCoupon } from '../../models/template-coupon/template-coupon.model';
import { TemplateCouponDTO } from './template-coupon.dto';

export type TemplateCouponsListResponse = LinkPaginationResponse<Array<TemplateCoupon>>;

@Injectable({
  providedIn: 'root',
})
export class TemplateCouponAdapter implements AdapterInterface<TemplateCouponsListResponse> {
  fromApi(response: HttpResponse<BaseResponse<Array<TemplateCouponDTO>>>): TemplateCouponsListResponse {
    const body: BaseResponse<Array<TemplateCouponDTO>> = new BaseResponse(response.body?.data ?? null, response.body?.error ?? null);
    return new LinkPaginationResponse<Array<TemplateCoupon>>(response.headers.get('Link') || '', this.getData(body.data), body.error);
  }

  private getData(templateCouponDtos: Array<TemplateCouponDTO> | null): Array<TemplateCoupon> | null {
    if (!templateCouponDtos) {
      return null;
    }
    return templateCouponDtos.map(
      (dto: TemplateCouponDTO): TemplateCoupon => ({
        id: dto.template_coupon_id,
        title: dto.title,
        kind: dto.kind,
        code: dto.code,
        discountQuantity: dto.discount_quantity,
        currencyIdentifier: dto.currency_identifier,
        currentUsages: dto.current_usages,
        totalAvailableUsages: dto.total_available_usages,
        currentConsumptions: dto.current_consumptions,
        totalAvailableConsumptions: dto.total_available_consumptions,
        status: dto.status,
        isActive: dto.is_active,
        startDate: dto.start_date ? moment(dto.start_date).toDate() : null,
        expirationDate: moment(dto.expiration_date).toDate(),
      }),
    );
  }
}
