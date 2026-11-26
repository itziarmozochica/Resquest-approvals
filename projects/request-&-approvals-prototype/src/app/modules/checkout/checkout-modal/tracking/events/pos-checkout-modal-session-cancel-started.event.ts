import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalSessionCancelStartedData {
  checkoutSessionId: string;
  fromStepId: string | null;
  legsCompleted: number;
  paidAmount: number;
}

export const posCheckoutModalSessionCancelStarted = defineEvent<PosCheckoutModalSessionCancelStartedData>(
  'pos.checkout.modal.session_cancel.started',
);
