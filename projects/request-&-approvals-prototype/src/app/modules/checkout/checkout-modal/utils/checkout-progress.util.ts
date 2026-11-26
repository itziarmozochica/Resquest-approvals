import type { CheckoutContext } from '../models/checkout.model';
import { toCents } from './checkout-split.util';

export function checkoutPaymentProgress(context: CheckoutContext): number {
  const totalCents = toCents(context.cartTotal?.amount ?? 0);
  if (totalCents <= 0) {
    return 0;
  }
  const paidCents = Math.max(toCents(context.paidAmount?.amount ?? 0), toCents(context.sessionPaidAmount?.amount ?? 0));
  return Math.min(1, Math.max(0, paidCents / totalCents));
}
