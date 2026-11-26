import { Money } from '@fz-original/app/shared/models/money.model';

export interface MembershipsData {
  memberCode: string | null;
  member: MembershipsMember | null;
  planDiscounts: Array<PlanDiscount>;
}

export interface MembershipsMember {
  holder: {
    name: string;
    email?: string;
  };
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
  };
}

export interface MembershipsMemberWithCode {
  member: MembershipsMember;
  code: string;
}

// TODO: Move to the correct model related to the plan
export interface PlanDiscount {
  ticketTypeId: number;
  couponCode: string;
  discount: number;
  discountType: PlanDiscountType;
  tier: PlanDiscountTier | null;
}

export interface PlanDiscountTier {
  name: string;
  backgroundColor: string;
  textColor: string;
}

export const enum PlanDiscountType {
  PERCENTAGE = 'percentage',
  AMOUNT = 'amount',
}

export interface AutoAppliedPlanDiscountsInfo {
  discount: number;
  discountType: PlanDiscountType;
  unitPriceWithDiscount: Money;
  unitPriceWithoutDiscount: Money;
}
