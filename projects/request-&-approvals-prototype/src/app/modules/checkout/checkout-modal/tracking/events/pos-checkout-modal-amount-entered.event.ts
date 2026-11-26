import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalAmountEnteredData {
  amount: number;
  checkoutSessionId: string;
  payRemaining: boolean;
  remainingAmount: number;
}

export const posCheckoutModalAmountEntered = defineEvent<PosCheckoutModalAmountEnteredData>('pos.checkout.modal.amount.entered');
