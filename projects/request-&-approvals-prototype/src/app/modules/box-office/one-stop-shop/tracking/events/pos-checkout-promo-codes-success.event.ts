import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCheckoutPromoCodesType = 'fever_coupon' | 'lazy_coupon';

export interface PosCheckoutPromoCodesSuccessData {
  promoCode: string;
  type: PosCheckoutPromoCodesType;
}

export const posCheckoutPromoCodesSuccess = defineEvent<PosCheckoutPromoCodesSuccessData>('pos.checkout.promo_codes.success');
