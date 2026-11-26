import { CouponApplyErrorCodes } from './apply-coupon-errors-enum.model';

/** The HTTP error a coupon apply request reports through the coupon input's `error` stream. */
export interface CouponApplyHttpError extends Error {
  error?: {
    error?: {
      error?: {
        code?: CouponApplyErrorCodes;
        lazy_coupon_type?: string | null;
      };
    };
  };
}
