import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalPaymentMethodChangedAfterFailData {
  checkoutSessionId: string;
  failureReason: string | null;
  previousMethod: string | null;
}

export const posCheckoutModalPaymentMethodChangedAfterFail = defineEvent<PosCheckoutModalPaymentMethodChangedAfterFailData>(
  'pos.checkout.modal.payment.method_changed_after_fail',
);
