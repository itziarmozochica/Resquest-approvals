import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { PosCheckoutPromoCodesType } from './pos-checkout-promo-codes-success.event';

export interface PosCheckoutPromoCodesFailureData {
  error: string;
  promoCode: string;
  type: PosCheckoutPromoCodesType;
  userError: string;
}

export const posCheckoutPromoCodesFailure = defineEvent<PosCheckoutPromoCodesFailureData>('pos.checkout.promo_codes.failure');
