import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCheckoutShiftCloseModalShiftType = 'optional' | 'required';

export interface PosCheckoutShiftCloseModalData {
  shiftType?: PosCheckoutShiftCloseModalShiftType;
}

export const posCheckoutShiftCloseModal = defineEvent<PosCheckoutShiftCloseModalData>('pos.checkout.shift.close.modal');
