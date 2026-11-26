import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Deposit } from '@fz-original/app/shared/models/deposit/deposit.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { subtractMoneys } from '@fz-original/app/shared/utils/number.util';

/**
 * Whether the deposit is paid for cart UI (labels, etc.). Uses API `deposit.status` only
 * (independent of coupon `creationPurpose` or legacy flags).
 */
export function hasPaidDepositForUi(deposit: Deposit | null | undefined): boolean {
  return deposit?.status === 'paid';
}

/**
 * Deposit deduction block: `status === 'paid'`, `calculatedAmount` (deposit paid line), and
 * `effectiveTotal` or derived reservation value — same rules as cart detail v2.
 */
export function shouldShowDepositDeductionBreakdown(cart: Cart | null | undefined): boolean {
  const deposit = cart?.deposit;
  if (!deposit?.calculatedAmount) return false;
  return deposit.status === 'paid';
}

export function wasDepositPaidForOrderBreakdown(cart: Cart | null | undefined): boolean {
  const deposit = cart?.deposit;
  if (!deposit?.calculatedAmount) return false;
  return deposit.status === 'paid' || deposit.status === 'refunded';
}

/**
 * `cart.total` is often the **balance after** a paid deposit; override / FINAL adjustment was applied to the
 * amount **before** that deposit. Re-add the deposit so client-side adjustment deltas match that order (no Fever2 change).
 */
export function getCartTotalMoneyBeforeDeposit(cart: Cart | null | undefined): Money | null {
  const total = cart?.total ?? null;
  if (!total || !cart || !shouldShowDepositDeductionBreakdown(cart)) {
    return total;
  }
  const dep = cart.deposit?.calculatedAmount;
  if (!dep?.amount || dep.currency !== total.currency) {
    return total;
  }
  return new Money(total.amount + dep.amount, total.currency);
}

function hasActiveCartPriceAdjustment(cart: Cart | null | undefined): boolean {
  return !!cart?.adjustment && cart.adjustment.amount !== null && cart.adjustment.amount !== undefined;
}

export function getReservationValueMoney(cart: Cart | null | undefined, options?: { fallbackCurrency?: string }): Money | null {
  if (!cart) return null;
  const currency = cart.total?.currency ?? options?.fallbackCurrency ?? 'EUR';
  if (hasActiveCartPriceAdjustment(cart) && cart.totalWithoutOverride != null && cart.totalWithoutOverride.amount != null) {
    return new Money(cart.totalWithoutOverride.amount, cart.totalWithoutOverride.currency ?? currency);
  }
  const deposit = cart?.deposit;
  if (deposit?.effectiveTotal && hasPaidDepositForUi(deposit)) {
    return deposit.effectiveTotal;
  }
  const totalAmount = cart.total?.amount ?? 0;
  const couponDiscountAmount = cart.appliedCoupon?.discount?.amount ?? 0;
  let reservationAmount = totalAmount + couponDiscountAmount;
  if (shouldShowDepositDeductionBreakdown(cart)) {
    const dep = cart.deposit?.calculatedAmount;
    if (dep?.amount != null && !Number.isNaN(dep.amount) && dep.currency === currency) {
      reservationAmount += dep.amount;
    }
  }
  return new Money(reservationAmount, currency);
}

export function getDepositPaidDeductionMoney(deposit: Deposit | null | undefined): Money | null {
  const calculated = deposit?.calculatedAmount;
  if (!calculated) return null;
  return new Money(-calculated.amount, calculated.currency);
}

export function withCartDepositFromSource(cart: Cart, depositSource: Cart): Cart;
export function withCartDepositFromSource(cart: Cart | null | undefined, depositSource: Cart): Cart;
export function withCartDepositFromSource(cart: Cart | null | undefined, depositSource: Cart): Cart {
  if (!cart) {
    return depositSource;
  }
  const deposit = depositSource.deposit;
  if (deposit == null) {
    return cart;
  }
  const next = cart.clone();
  next.deposit = deposit;
  return next;
}

export function getOrderSettlementPaymentMoney(cart: Cart | null | undefined): Money | null {
  if (!wasDepositPaidForOrderBreakdown(cart)) {
    return null;
  }
  const reservationValue = cart?.total;
  const depositPaid = cart?.deposit?.calculatedAmount;
  if (!reservationValue || !depositPaid) {
    return null;
  }
  const settlement = subtractMoneys(reservationValue, depositPaid);
  if (settlement.amount <= 0) {
    return null;
  }
  return settlement;
}
