import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { fixedDecimals } from '@fz-original/app/shared/utils/number.util';

import { ExpectedCharge } from '../models/expected-charge.model';

/** Returns what the server cart would charge when it differs from the expected charge, `null` when they agree. */
export function findChargeMismatch(cart: Cart, expected: ExpectedCharge): ExpectedCharge | null {
  const charged: ExpectedCharge = {
    couponCode: cart.appliedCoupon?.code ?? null,
    total: cart.total ?? new Money(0, expected.total.currency),
  };
  const isSameTotal = fixedDecimals(charged.total.amount, 2) === fixedDecimals(expected.total.amount, 2);

  return isSameTotal && charged.couponCode === expected.couponCode ? null : charged;
}
