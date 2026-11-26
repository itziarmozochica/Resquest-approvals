import type {
  ContactInformationField,
  ContactInformationOrderableField,
  ContactInformationRequirement,
  CutterType,
  OboFlowType,
  OboPrinterType,
  OnsiteDeviceType,
  OnsiteSetupPaymentGateway,
  OssCustomTabType,
  PaperType,
  PriceViewer,
  ReceiptPrinterType,
  SessionAvailabilityCacheStrategy,
  ShiftStrategy,
  TicketSelectorType,
  TicketValidationType,
} from './onsite-setup.literals';

export type PaymentConfigurationGatewayProvider = 'adyen' | 'adyen_local' | 'payhere' | 'square';

export interface AdyenLocalProviderConfigApi {
  adyen_merchant_account: string;
  key_identifier: string | null;
  key_version: number | null;
  key_passphrase?: string;
  tap_to_pay_enabled?: boolean;
}

export interface PayhereProviderConfigApi {
  merchant_id: string;
}

export interface SquareProviderConfigApi {
  application_id: string;
  location_id: string;
}

export type ProviderConfigApi = AdyenLocalProviderConfigApi | PayhereProviderConfigApi | SquareProviderConfigApi;

export interface ContactInformationSetupApi {
  fields: ContactInformationField[];
  requirement_on_current_day: ContactInformationRequirement;
  fields_order?: ContactInformationOrderableField[] | null;
}

export interface OnsiteSetupOssCustomTabApi {
  icon: string;
  id: string;
  name: string;
  position: number;
  type: OssCustomTabType;
}

export interface OnsiteSetupPlaceApi {
  city_id: number;
  id: number;
  name: string;
  country_iso_code_2?: string;
}

export interface PaymentMethodSetupApi {
  payment_method: string;
}

export interface SessionAvailabilityPlanConfigApi {
  plan_id: number;
  strategy: SessionAvailabilityCacheStrategy;
  timeout_in_seconds?: number;
}

export interface OnsiteSetupPaymentConfigurationMethodApi {
  code: string;
  default_display_name_key: string;
}

export interface OnsiteSetupPaymentConfigurationTerminalApi {
  external_id: string;
  id: string;
  label: string | null;
}

export interface OnsiteSetupPaymentConfigurationIntegratedGatewayApi {
  id: string;
  provider: PaymentConfigurationGatewayProvider;
  provider_config: ProviderConfigApi | null;
  selected_methods: OnsiteSetupPaymentConfigurationMethodApi[];
  terminals: OnsiteSetupPaymentConfigurationTerminalApi[];
}

export interface OnsiteSetupPaymentConfigurationApi {
  allow_split_payments: boolean;
  delegated_methods: OnsiteSetupPaymentConfigurationMethodApi[];
  id: string;
  integrated_gateway: OnsiteSetupPaymentConfigurationIntegratedGatewayApi | null;
  location_id: string;
  name: string;
}

export interface SecondScreenConfigurationApi {
  created_at: string;
  id: string;
  logo_url: string | null;
  name: string;
  partner_id: number;
  qr_url: string | null;
  standby_images: string[];
  standby_title: string | null;
  updated_at: string;
  farewell_image_url?: string | null;
  standby_video_url?: string | null;
}

export interface OnsiteSetupApi {
  allow_delegated_payment: boolean;
  cash_registers: string[];
  channel_id: string;
  device_type: OnsiteDeviceType;
  id: string;
  location_id: string;
  max_purchasable_days: number;
  name: string;
  obo_payment_gateway: OnsiteSetupPaymentGateway;
  obo_payment_terminal_ids: string[];
  preset_coupon_codes: string[];
  show_sold_out_sessions: boolean;
  access_control_setup_id?: string;
  allow_split_payments?: boolean;
  can_override_capacities?: boolean;
  contact_information_setup?: ContactInformationSetupApi;
  custom_tab_id?: string;
  custom_tabs?: OnsiteSetupOssCustomTabApi[];
  cutter_type?: CutterType;
  obo_flow_type?: OboFlowType;
  obo_printer_type?: OboPrinterType;
  paper_type?: PaperType;
  partner_id?: number;
  payment_configuration?: OnsiteSetupPaymentConfigurationApi | null;
  payment_extra_information?: string;
  payment_methods?: PaymentMethodSetupApi[];
  place?: OnsiteSetupPlaceApi;
  place_id?: number;
  price_viewer?: PriceViewer;
  print_configuration_bundle_id?: string | null;
  print_tickets_combined_for_plans?: number[];
  prioritized_main_plans?: number[];
  products_holder_plan_id?: number;
  receipt_printer_type?: ReceiptPrinterType;
  retail_setup_id?: string;
  second_screen_configuration?: SecondScreenConfigurationApi | null;
  second_screen_configuration_id?: string | null;
  selected_terminal_ids?: string[];
  session_availability_cache_strategy?: SessionAvailabilityCacheStrategy;
  session_availability_cache_timeout_in_seconds?: number;
  session_availability_plan_configs?: SessionAvailabilityPlanConfigApi[];
  shift_max_hours_open?: number;
  shift_strategy?: ShiftStrategy;
  square_application_id?: string;
  square_location_id?: string;
  ticket_selector_type?: TicketSelectorType;
  ticket_validation?: TicketValidationType;
  user_id?: number;
  validation_profiles?: string[];
  warehouse_id?: string;
}

export type OnsiteSetup = OnsiteSetupApi;
