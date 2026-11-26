export interface BundleSessionTypeDiscountConfigurationResponseData {
  id: number;
  session_type_id: number;
  type: string;
  require_matching_tag: boolean;
  quantity: number;
  percentage_paid_by_partner: number;
  size: number | null;
}

export interface BundleResponseData {
  id: number;
  main_plan_id: number;
  order: number;
  optional: boolean;
  is_active: boolean;
  color: string | null;
  session_type_discounts: BundleSessionTypeDiscountConfigurationResponseData[];
}

export interface BundleConfigurationResponseData {
  type: string;
  max_date_selection_span_in_days: 0 | null;
  session_offset_minutes: number | null;
  discount_application_mode: string;
  flow: string;
  min_bundle_size: number | null;
  max_bundle_size: number | null;
  related_main_plans: BundleResponseData[];
}

export interface BundleConfigurationResponse {
  bundle_configuration: BundleConfigurationResponseData;
}
