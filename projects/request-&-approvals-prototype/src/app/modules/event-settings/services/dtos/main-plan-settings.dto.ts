export interface MainPlanSettingsDto {
  permissions: string[];
  settings: MainPlanSettingsSettingsDto;
}

export interface ValueWithAllowed<T> {
  allowed_values: T[];
  current_value: T;
}

export interface TransportConfigurationDto {
  is_enabled: boolean;
  external_event_id?: string | null;
  transport_provider_id?: number | null;
}

export interface MainPlanSettingsSettingsDto {
  allow_loyalty_redemption?: boolean;
  allow_ticket_cancellations?: boolean;
  base_locale?: string;
  calendar_selector?: boolean;
  can_validate_method?: number;
  category?: ValueWithAllowed<string> | string;
  cities?: number[];
  continuous_time_selector?: boolean;
  contracts?: string[] | Array<{ id: string; name: string }>;
  deny_publishing_in_ota?: boolean;
  disallow_indexing?: boolean;
  has_price_list_pricing?: boolean;
  hide_coupon_loyalty?: boolean;
  hide_help?: boolean;
  hours_before_session_cancellation_not_allowed?: number;
  label_format?: string;
  max_fever_credit_allowed?: string;
  must_use_tax_base?: boolean;
  override_capacity_limit?: number | null;
  partnership_type?: ValueWithAllowed<string> | string;
  redirect_to_id?: number | null;
  request_general_review?: boolean | null | string;
  required_3ds?: boolean;
  required_purchase_terms?: string | null;
  reselling_providers?: string[];
  allow_invitation_reselling?: boolean;
  selector_setting_type?: ValueWithAllowed<string> | string;
  session_selector?: ValueWithAllowed<string> | string | null;
  session_selector_type?: ValueWithAllowed<string> | string;
  should_charge_booking_fees_on_exchange?: boolean;
  show_important_information?: boolean;
  transport_configuration?: TransportConfigurationDto;
  type?: ValueWithAllowed<string> | string;
  validation_method?: ValueWithAllowed<string> | string | null;
}
