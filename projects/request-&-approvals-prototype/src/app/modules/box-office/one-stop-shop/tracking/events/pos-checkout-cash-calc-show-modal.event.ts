import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutCashCalcShowModalData {
  toBePaid: number;
}

export const posCheckoutCashCalcShowModal = defineEvent<PosCheckoutCashCalcShowModalData>('pos.checkout.cash_calc.show_modal');
