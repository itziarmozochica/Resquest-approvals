import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';

import type { CheckoutContext } from '../models/checkout.model';
import { fromCents, resolveCurrentLegAmountCents, toCents } from './checkout-split.util';

export function countCompletedCashLegs(context: CheckoutContext): number {
  return context.transactions.filter(transaction => transaction.method === PaymentType.CASH && transaction.status === 'completed').length;
}

export function requiresCashTenderedCapture(context: CheckoutContext): boolean {
  return (
    context.selectedMethod === PaymentType.CASH && context.selectedMethodDelegated === true && resolveCurrentLegAmountCents(context) > 0
  );
}

export function isCashCaptureMandatory(context: CheckoutContext): boolean {
  return context.cashCaptureMode === 'mandatory';
}

export function reportsCashTendered(context: CheckoutContext): boolean {
  return isCashCaptureMandatory(context) && requiresCashTenderedCapture(context);
}

export function canSkipCashCapture(context: CheckoutContext): boolean {
  return !isCashCaptureMandatory(context) && (context.calculatorReceivedAmount ?? 0) <= 0;
}

export function canContinueCashCapture(context: CheckoutContext): boolean {
  return !canSkipCashCapture(context);
}

export function canConfirmCashCapture(context: CheckoutContext): boolean {
  if (!isCashCaptureMandatory(context)) {
    return true;
  }
  const legAmountCents = resolveCurrentLegAmountCents(context);
  return legAmountCents > 0 && toCents(context.calculatorReceivedAmount ?? 0) >= legAmountCents;
}

export function resolveCashLegAmount(context: CheckoutContext): number {
  return fromCents(resolveCurrentLegAmountCents(context));
}

export function resolveCashSplitLegIndex(context: CheckoutContext): number {
  return countCompletedCashLegs(context);
}
