import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCheckoutPromoCodesCloseModalInteractionType = 'apply_promo_code' | 'close';

export interface PosCheckoutPromoCodesCloseModalData {
  interactionType: PosCheckoutPromoCodesCloseModalInteractionType;
  selectedPromoCode: string;
}

export const posCheckoutPromoCodesCloseModal = defineEvent<PosCheckoutPromoCodesCloseModalData>('pos.checkout.promo_codes.close_modal');
