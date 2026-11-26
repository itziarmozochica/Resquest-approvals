import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalSessionCancelRetriedData {
  checkoutSessionId: string;
  previousReason: string | null;
  retryCount: number;
}

export const posCheckoutModalSessionCancelRetried = defineEvent<PosCheckoutModalSessionCancelRetriedData>(
  'pos.checkout.modal.session_cancel.retried',
);
