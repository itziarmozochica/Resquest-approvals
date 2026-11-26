import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { PosCheckoutContactInfoField } from './pos-checkout-contact-info-close-modal.event';

export interface PosCheckoutContactInfoShowModalData {
  requiredFields: PosCheckoutContactInfoField[];
  visibleFields: PosCheckoutContactInfoField[];
}

export const posCheckoutContactInfoShowModal = defineEvent<PosCheckoutContactInfoShowModalData>('pos.checkout.contact_info.show_modal');
