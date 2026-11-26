import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutPromoCodesShowModalData {
  availableLazyCouponTypes: string[];
  preselectedCouponCount: number;
  preselectedCoupons: string[];
}

export const posCheckoutPromoCodesShowModal = defineEvent<PosCheckoutPromoCodesShowModalData>('pos.checkout.promoCodes.showModal');
