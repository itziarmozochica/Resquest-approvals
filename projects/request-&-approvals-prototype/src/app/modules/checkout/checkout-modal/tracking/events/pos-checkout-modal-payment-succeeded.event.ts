import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalPaymentSucceededData {
  checkoutSessionId: string;
  flowType: string | null;
  isLastLeg: boolean;
  isResend: boolean;
  isSplit: boolean;
  legAmount: number;
  legIndex: number;
  legsCompleted: number;
  paidAmount: number;
  paymentMethod: string | null;
  remainingAfter: number;
}

export const posCheckoutModalPaymentSucceeded = defineEvent<PosCheckoutModalPaymentSucceededData>('pos.checkout.modal.payment.succeeded');
