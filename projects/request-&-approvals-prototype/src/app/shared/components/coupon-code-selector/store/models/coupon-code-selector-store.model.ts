import type { PresetCoupon } from '@fz-original/app/modules/box-office/shared/models/preset-coupon';

export interface PresetCouponSelection {
  code: string;
  nonce: number;
}

export interface CouponCodeSelectorStoreState {
  isApplyingPreset: boolean;
  isLoadingPresets: boolean;
  lazyCoupons: PresetCoupon[];
  presetCoupons: PresetCoupon[];
  presetCouponSelection: PresetCouponSelection | null;
  searchInteractionNonce: number;
}

export const initialState: CouponCodeSelectorStoreState = {
  isApplyingPreset: false,
  isLoadingPresets: false,
  lazyCoupons: [],
  presetCoupons: [],
  presetCouponSelection: null,
  searchInteractionNonce: 0,
};
