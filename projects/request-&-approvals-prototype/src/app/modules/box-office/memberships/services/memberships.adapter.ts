import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import { MembershipsMember, PlanDiscount } from '../models/memberships.model';
import {
  MembershipsDiscountCodesResponse,
  MembershipsMemberResponse,
  PlanDiscountsResponse,
} from '../models/responses/memberships-response.model';

@Injectable({
  providedIn: 'root',
})
export class OBOMembershipsAdapter {
  adaptMembershipsMember(response: BaseResponse<MembershipsMemberResponse>): BaseResponse<MembershipsMember> {
    return new BaseResponse<MembershipsMember>(this.#getMembershipsMemberData(response?.data), this.#getError(response?.error));
  }

  adaptMembershipsDiscountCodes(response: BaseResponse<MembershipsDiscountCodesResponse>): BaseResponse<Array<string>> {
    return new BaseResponse<Array<string>>(this.#getMembershipsDiscountCodesData(response?.data), this.#getError(response?.error));
  }

  adaptPlanDiscounts(response: BaseResponse<PlanDiscountsResponse>): BaseResponse<Array<PlanDiscount>> {
    return new BaseResponse<Array<PlanDiscount>>(this.#getPlanDiscountsData(response?.data), this.#getError(response?.error));
  }

  #getError(data: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (!data) {
      return null;
    }
    return { code: data.code, message: `errors.${data.code}` };
  }

  #getMembershipsMemberData(data: MembershipsMemberResponse | null | undefined): MembershipsMember | null {
    if (!data) {
      return null;
    }

    const customerFirstName = data.customer.first_name;
    const customerLastName = data.customer.last_name;
    const customerEmail = data.customer.email ?? '';

    return {
      holder: {
        name: data.holder?.name ?? `${customerFirstName} ${customerLastName}`.trim(),
        email: data.holder?.email ?? customerEmail,
      },
      customer: {
        firstName: customerFirstName,
        lastName: customerLastName,
        email: customerEmail,
        phoneNumber: data.customer?.phone_number ?? '',
      },
    };
  }

  #getMembershipsDiscountCodesData(data: MembershipsDiscountCodesResponse | null | undefined): Array<string> {
    if (!data) {
      return [];
    }

    return data.discount_codes ?? [];
  }

  #getPlanDiscountsData(data: PlanDiscountsResponse | null | undefined): Array<PlanDiscount> {
    if (!data?.discounts?.length) {
      return [];
    }

    return data.discounts.map(discount => ({
      ticketTypeId: discount.session_type_id,
      couponCode: discount.coupon_code,
      discount: discount.discount,
      discountType: discount.discount_type,
      tier: discount.extra?.membership_tier
        ? {
            name: discount.extra.membership_tier.name,
            backgroundColor: discount.extra.membership_tier.background_color,
            textColor: discount.extra.membership_tier.text_color,
          }
        : null,
    }));
  }
}
