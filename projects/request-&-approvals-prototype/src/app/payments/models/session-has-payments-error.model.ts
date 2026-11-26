import type { CartPaymentSession } from './payments.model';
import { SESSION_HAS_PAYMENTS_ERROR_CODE } from './payments.model';

export class SessionHasPaymentsError extends Error {
  constructor(
    readonly session: CartPaymentSession,
    readonly splitPaidAmount: number,
  ) {
    super(SESSION_HAS_PAYMENTS_ERROR_CODE);
    this.name = 'SessionHasPaymentsError';
  }
}
