import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalCalculatorOpenedData {
  checkoutSessionId: string;
  legAmount: number;
  sourceStep: string | null;
}

export const posCheckoutModalCalculatorOpened = defineEvent<PosCheckoutModalCalculatorOpenedData>('pos.checkout.modal.calculator.opened');
