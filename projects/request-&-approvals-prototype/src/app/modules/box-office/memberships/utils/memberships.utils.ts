import { CustomerType } from '@fz-original/app/shared/models/customer/customer-type.enum';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { Terms } from '@fz-original/app/shared/models/customer/terms.enum';
import { Money } from '@fz-original/app/shared/models/money.model';
import { fixedDecimals } from '@fz-original/app/shared/utils/number.util';

import { AutoAppliedPlanDiscountsInfo, MembershipsData, MembershipsMember, PlanDiscountType } from '../models/memberships.model';

// TODO: Move to the correct utils file related to discounts
export function calculateTotalDiscount(price: number, currency: string, discount: { amount: number; type: PlanDiscountType }): Money {
  if (price === 0) {
    return new Money(0, currency);
  }

  let priceWithDiscount = 0;
  switch (discount.type) {
    case PlanDiscountType.PERCENTAGE: {
      const totalDiscount = (price * discount.amount) / 100;
      priceWithDiscount = price - totalDiscount;
      break;
    }
    case PlanDiscountType.AMOUNT:
    default: {
      priceWithDiscount = price - discount.amount;
      break;
    }
  }

  return new Money(fixedDecimals(Math.max(0, priceWithDiscount), 2), currency);
}

export function calculateAutoAppliedPlanDiscountsInfo(
  discount: number,
  discountType: PlanDiscountType,
  originalUnitPrice: Money,
): AutoAppliedPlanDiscountsInfo {
  return {
    discount: discount,
    discountType: discountType,
    unitPriceWithDiscount: calculateTotalDiscount(originalUnitPrice.amount ?? 0, originalUnitPrice.currency ?? '', {
      amount: discount,
      type: discountType,
    }),
    unitPriceWithoutDiscount: originalUnitPrice,
  };
}

/** A fresh "nobody identified" state. A factory, not a shared const: callers mutate the object. */
export function emptyMembershipsData(): MembershipsData {
  return { memberCode: null, member: null, planDiscounts: [] };
}

export function buildCustomerFromMember(member: MembershipsMember): Customer {
  return {
    acceptedTerms: [Terms.ON_SITE_TERMS_OF_PRIVACY],
    email: member.customer.email ?? '',
    firstName: member.customer.firstName,
    lastName: member.customer.lastName,
    phoneNumber: member.customer.phoneNumber ?? '',
    type: CustomerType.USER,
  };
}
