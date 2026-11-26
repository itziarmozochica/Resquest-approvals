import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalPaymentFailedData {
  checkoutSessionId: string;
  failureReason: string | null;
  isResend: boolean;
  paymentMethod: string | null;
  sessionPaidAmount: number;
}

export const posCheckoutModalPaymentFailed = defineEvent<PosCheckoutModalPaymentFailedData>('pos.checkout.modal.payment.failed');
