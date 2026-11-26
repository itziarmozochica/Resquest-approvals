import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCheckoutShiftShowModalShiftType = 'optional' | 'required';

export interface PosCheckoutShiftShowModalData {
  shiftType?: PosCheckoutShiftShowModalShiftType;
}

export const posCheckoutShiftShowModal = defineEvent<PosCheckoutShiftShowModalData>('pos.checkout.shift.show.modal');
