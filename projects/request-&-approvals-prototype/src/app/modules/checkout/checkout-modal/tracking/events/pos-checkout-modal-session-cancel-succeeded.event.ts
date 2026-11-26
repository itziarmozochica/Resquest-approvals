import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalSessionCancelSucceededData {
  checkoutSessionId: string;
  legsCompleted: number;
  paidAmount: number;
}

export const posCheckoutModalSessionCancelSucceeded = defineEvent<PosCheckoutModalSessionCancelSucceededData>(
  'pos.checkout.modal.session_cancel.succeeded',
);
