import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCheckoutCashCalcCloseModalAction = 'cancel' | 'continue' | 'skip';

export interface PosCheckoutCashCalcCloseModalData {
  action: PosCheckoutCashCalcCloseModalAction;
  change: number | null;
  received: number | null;
  toBePaid: number;
}

export const posCheckoutCashCalcCloseModal = defineEvent<PosCheckoutCashCalcCloseModalData>('pos.checkout.cash_calc.close_modal');
