import { PlanDiscountType } from '../memberships.model';

export interface MembershipsMemberResponse {
  holder: {
    name?: string;
    email?: string;
  };
  customer: {
    first_name: string;
    last_name: string;
    email?: string;
    phone_number?: string;
  };
}

export interface MembershipsDiscountCodesResponse {
  discount_codes: Array<string>;
}

export interface PlanDiscountsResponse {
  discounts: Array<PlanDiscountResponse>;
}

export interface PlanDiscountResponse {
  session_type_id: number;
  coupon_code: string;
  discount: number;
  discount_type: PlanDiscountType;
  extra: PlanDiscountExtraResponse | null;
}

export interface PlanDiscountExtraResponse {
  membership_tier: PlanDiscountTierResponse | null;
}

export interface PlanDiscountTierResponse {
  name: string;
  background_color: string;
  text_color: string;
}
