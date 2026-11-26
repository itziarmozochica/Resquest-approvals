import type { CartPaymentSession } from './payments.model';

export class CartPaymentTriggerError extends Error {
  constructor(
    readonly session: CartPaymentSession,
    readonly triggerError: unknown,
  ) {
    super('checkout.payment.triggerFailed');
    this.name = 'CartPaymentTriggerError';
  }
}
