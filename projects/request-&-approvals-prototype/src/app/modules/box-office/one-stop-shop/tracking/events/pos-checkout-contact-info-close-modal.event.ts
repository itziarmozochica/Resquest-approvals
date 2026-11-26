import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCheckoutContactInfoField = 'email' | 'first_name' | 'last_name' | 'phone';

export type PosCheckoutContactInfoCloseModalAction = 'close' | 'continue' | 'skip';
export interface PosCheckoutContactInfoCloseModalData {
  action: PosCheckoutContactInfoCloseModalAction;
  filledFields: PosCheckoutContactInfoField[];
  requiredFields: PosCheckoutContactInfoField[];
  visibleFields: PosCheckoutContactInfoField[];
}

export const posCheckoutContactInfoCloseModal = defineEvent<PosCheckoutContactInfoCloseModalData>('pos.checkout.contact_info.close_modal');
