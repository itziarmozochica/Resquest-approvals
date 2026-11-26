import { Money } from '@fz-original/app/shared/models/money.model';

import { CancellationCouponSummary } from './cancellation-coupon-summary.model';
import { CompensationCouponSummary } from './compensation-coupon-summary.model';

export interface RefundDetailsSummary {
  cancellationCoupons: CancellationCouponSummary[];
  compensationCoupons: CompensationCouponSummary[];
  depositRefundAmount: Money | null;
  depositRefundedAt: string | null;
  refundAmount: Money | null;
  refundedAt: string | null;
}
