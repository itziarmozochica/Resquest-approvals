import { BundleDiscountApplicationMode } from '@fz-original/app/modules/bundles/models/bundle-discount-application-mode.model';
import { BundleFlow } from '@fz-original/app/modules/bundles/models/bundle-flow.model';

export interface UpdateBundleConfigurationBodyContentSessionTypeDiscountConfiguration {
  id: number;
  session_type_id: number;
  type: string;
  require_matching_tag: boolean;
  quantity: number;
  percentage_paid_by_partner: number;
  size: number | null;
}

export interface UpdateBundleConfigurationBodyContentBundle {
  id?: number;
  main_plan_id: number;
  order: number;
  is_active: boolean;
  color: string | null;
  session_type_discounts: UpdateBundleConfigurationBodyContentSessionTypeDiscountConfiguration[];
}

interface UpdateBundleConfigurationBodyContent {
  max_date_selection_span_in_days: 0 | null;
  session_offset_minutes: number | null;
  flow: BundleFlow;
  min_bundle_size: number | null;
  max_bundle_size: number | null;
  related_main_plans: UpdateBundleConfigurationBodyContentBundle[];
  type: string;
  discount_application_mode?: BundleDiscountApplicationMode;
}

export interface UpdateBundleConfigurationBody {
  bundle_configuration: UpdateBundleConfigurationBodyContent;
}
