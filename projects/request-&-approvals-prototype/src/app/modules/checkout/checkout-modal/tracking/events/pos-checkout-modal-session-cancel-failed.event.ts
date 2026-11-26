import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalSessionCancelFailedData {
  cancelFailureReason: string | null;
  checkoutSessionId: string;
  retryCount: number;
}

export const posCheckoutModalSessionCancelFailed = defineEvent<PosCheckoutModalSessionCancelFailedData>(
  'pos.checkout.modal.session_cancel.failed',
);
