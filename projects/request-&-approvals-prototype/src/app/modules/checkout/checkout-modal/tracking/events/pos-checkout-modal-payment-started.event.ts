import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalPaymentStartedData {
  checkoutSessionId: string;
  flowType: string | null;
  isResend: boolean;
  isSplit: boolean;
  legAmount: number;
  legIndex: number;
  paymentMethod: string;
  remainingBefore: number;
}

export const posCheckoutModalPaymentStarted = defineEvent<PosCheckoutModalPaymentStartedData>('pos.checkout.modal.payment.started');
