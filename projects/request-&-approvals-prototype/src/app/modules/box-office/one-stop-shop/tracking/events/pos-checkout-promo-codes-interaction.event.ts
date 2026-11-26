import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCheckoutPromoCodesInteractionType = 'custom' | 'lazy_coupon' | 'preselected' | 'search';

export interface PosCheckoutPromoCodesInteractionData {
  availableLazyCouponTypes: string[];
  interactionType: PosCheckoutPromoCodesInteractionType;
  preselectedCouponCount: number;
  preselectedCoupons: string[];
}

export const posCheckoutPromoCodesInteraction = defineEvent<PosCheckoutPromoCodesInteractionData>('pos.checkout.promoCodes.interaction');
