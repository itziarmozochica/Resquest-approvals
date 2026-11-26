import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalPaymentRetriedData {
  checkoutSessionId: string;
  paymentMethod: string | null;
  previousFailureReason: string | null;
}

export const posCheckoutModalPaymentRetried = defineEvent<PosCheckoutModalPaymentRetriedData>('pos.checkout.modal.payment.retried');
