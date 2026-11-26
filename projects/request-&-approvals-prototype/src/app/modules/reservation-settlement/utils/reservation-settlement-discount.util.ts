import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { fixedDecimals } from '@fz-original/app/shared/utils/number.util';

import { ReservationSettlementSession } from '../models/reservation-settlement-session.model';

export function adoptReservationSettlementCartAfterCouponRemoval(
  session: ReservationSettlementSession,
  serverCart: Cart,
  cart: Cart | null,
): void {
  const serverTotal = serverCart.total ?? null;

  session.cart.appliedCoupon = null;
  session.cart.totalWithoutDiscount = null;

  if (serverTotal !== null) {
    session.cart.total = serverTotal;
  }

  if (cart === null) {
    return;
  }

  cart.appliedCoupon = null;

  if (serverTotal !== null) {
    cart.total = serverTotal;
    cart.totalWithoutDiscount = serverTotal;
  }
}

export function adoptReservationSettlementCoupon(cart: Cart): Coupon | null {
  const appliedCoupon = cart.appliedCoupon ?? null;

  if (appliedCoupon !== null && cart.total != null && cart.totalWithoutDiscount == null) {
    cart.totalWithoutDiscount = new Money(fixedDecimals(cart.total.amount + appliedCoupon.discount.amount, 3), cart.total.currency);
  }

  return appliedCoupon;
}

export function isInheritedReservationSettlementCoupon(
  coupon: Coupon | null | undefined,
  session: ReservationSettlementSession | null | undefined,
): boolean {
  const inheritedCode = session?.cart?.appliedCoupon?.code ?? null;

  return inheritedCode !== null && coupon?.code === inheritedCode;
}

export function applyReservationSettlementDiscount(cart: Cart, coupon?: Coupon | null): void {
  const baseTotal = cart.totalWithoutDiscount ?? cart.total ?? new Money(0, '');
  const discount = coupon?.discount?.amount ?? 0;

  cart.totalWithoutDiscount = baseTotal;
  cart.total = new Money(Math.max(fixedDecimals(baseTotal.amount - discount, 3), 0), baseTotal.currency);
}
