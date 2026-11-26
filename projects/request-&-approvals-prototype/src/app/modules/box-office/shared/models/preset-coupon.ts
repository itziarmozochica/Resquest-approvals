export interface PresetCouponDTO {
  code: string;
  title: string;
}

export interface PresetCouponsDTO {
  coupons: PresetCouponDTO[];
  lazy_coupons: PresetCouponDTO[];
}

export interface PresetCoupon {
  code: string;
  title: string;
}

export interface PresetCoupons {
  coupons: PresetCoupon[];
  lazyCoupons: PresetCoupon[];
}
