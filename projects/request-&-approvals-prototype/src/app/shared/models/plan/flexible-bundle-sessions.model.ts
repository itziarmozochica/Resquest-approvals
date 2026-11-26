import { Money } from '../money.model';

export type FlexibleBundleDiscountType = 'percentage' | 'amount';

export interface FlexibleBundleSessionsPriceInfoDTO {
  amount: number;
  currency: string;
}

export interface FlexibleBundleSessionsPricingDiscountByBundleSizeDTO {
  discount: number;
  discount_type: FlexibleBundleDiscountType;
  price_info: FlexibleBundleSessionsPriceInfoDTO;
  size: number | null;
}

export interface FlexibleBundleSessionsSessionDTO {
  id: number;
  label: string;
  price_info: FlexibleBundleSessionsPriceInfoDTO;
  pricing_discount_by_bundle_size: FlexibleBundleSessionsPricingDiscountByBundleSizeDTO[];
  session_type_id: number;
  source_session_type_id: number;
}

export interface FlexibleBundleSessionsPlanDTO {
  exclude_from_bundle_size_count: boolean;
  id: number;
  sessions: FlexibleBundleSessionsSessionDTO[];
}

export interface FlexibleBundleSessionsDTO {
  plans: FlexibleBundleSessionsPlanDTO[];
}

export interface FlexibleBundlePricingDiscountByBundleSize {
  discount: number;
  discountType: FlexibleBundleDiscountType;
  price: Money;
  size: number | null;
}

export interface FlexibleBundleSession {
  id: number;
  label: string;
  price: Money;
  pricingDiscountByBundleSize: FlexibleBundlePricingDiscountByBundleSize[];
  sessionTypeId: number;
  sourceSessionTypeId: number;
}

export interface FlexibleBundlePlan {
  excludeFromBundleSizeCount: boolean;
  id: number;
  sessions: FlexibleBundleSession[];
}

export interface FlexibleBundleSessions {
  plans: FlexibleBundlePlan[];
}

export interface FlexibleBundleSessionsQuery {
  channelId: string;
}
