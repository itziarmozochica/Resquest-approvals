import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalCalculatorClosedData {
  checkoutSessionId: string;
  legAmount: number;
  sourceStep: string | null;
}

export const posCheckoutModalCalculatorClosed = defineEvent<PosCheckoutModalCalculatorClosedData>('pos.checkout.modal.calculator.closed');
