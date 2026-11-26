import { BundleDiscountApplicationMode } from '@fz-original/app/modules/bundles/models/bundle-discount-application-mode.model';
import { BundleDiscountType } from '@fz-original/app/modules/bundles/models/bundle-discount-type';
import { BundleFlow } from '@fz-original/app/modules/bundles/models/bundle-flow.model';
import { BundleType } from '@fz-original/app/modules/bundles/models/bundle-type.model';

export interface BundleSessionTypeDiscountConfiguration {
  id: number;
  sessionTypeId: number;
  type: BundleDiscountType;
  requireMatchingTag: boolean;
  quantity: number;
  percentagePaidByPartner: number;
  size: number | null;
}

export interface Bundle {
  id: number;
  mainPlanId: number;
  order: number;
  optional: boolean;
  isActive: boolean;
  color: string | null;
  sessionTypeDiscounts: BundleSessionTypeDiscountConfiguration[];
}

export interface BundleConfiguration {
  parentMainPlanId: number;
  type: BundleType;
  maxDateSelectionSpanInDays: 0 | null;
  sessionOffsetMinutes: number | null;
  discountApplicationMode: BundleDiscountApplicationMode;
  flow: BundleFlow;
  minBundleSize: number | null;
  maxBundleSize: number | null;
  relatedMainPlans: Bundle[];
}
