import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalPayRemainingToggledData {
  checkoutSessionId: string;
  payRemaining: boolean;
  remainingAmount: number;
}

export const posCheckoutModalPayRemainingToggled = defineEvent<PosCheckoutModalPayRemainingToggledData>(
  'pos.checkout.modal.pay_remaining.toggled',
);
