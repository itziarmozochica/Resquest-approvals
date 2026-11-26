import { PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';

import { OnsiteDeviceType } from './onsite-device-type.enum';
import {
  PaymentConfigurationCheckoutFlow,
  PaymentConfigurationGatewayProvider,
  PaymentConfigurationMethodGatewayProvider,
} from './payment-configuration';
import { ProviderConfigDto } from './payment-configuration-dto';
import { SecondScreenConfiguration } from './second-screen-configuration';

export enum ShiftStrategyEnum {
  disabled = 'disabled',
  mandatory = 'mandatory',
  optional = 'optional',
}

export enum OboFlowTypeEnum {
  all_steps = 'all_steps',
  one_step = 'one_step',
  one_stop_shop = 'one_stop_shop',
}

export enum PaperTypeEnum {
  basic_paper = 'basic-paper',
  pre_printed_paper = 'pre-printed-paper',
}

export enum CutterTypeEnum {
  basic_cutter = 'basic-cutter',
  none = 'none',
}

export enum PriceViewerEnum {
  bixolodon_bdc_2000 = 'bixolodon-bdc-2000',
  none = 'none',
}

export enum TicketValidationTypeEnum {
  autovalidation = 'autovalidation',
  manual_validation = 'manual_validation',
  no_validation = 'no_validation',
}

export enum OboPrinterTypeEnum {
  adyen_printer = 'adyen_printer',
  /** Backend-only value, never offered in the onsite setup form. */
  epson_printer = 'epson_printer',
  no_printer = 'no_printer',
  zebra_printer = 'zebra_printer', //Deprecated
  zebra_printer_v2 = 'zebra_printer_v2',
}

export enum ReceiptPrinterType {
  adyen = 'adyen',
  epson = 'epson',
}

export enum HardwareTypeEnum {
  desktop = 'desktop',
  dual_screen = 'dual_screen',
  unknown = 'unknown',
}

export enum TicketSelectorTypeEnum {
  standard = 'standard',
  party_members = 'party_members',
}

export interface PaymentMethodSetup {
  payment_method: string;
}

export const OssCustomTabType = {
  parent_hierarchy_element: 'parent_hierarchy_element',
  specific_items: 'specific_items',
} as const;

export type OssCustomTabTypes = (typeof OssCustomTabType)[keyof typeof OssCustomTabType];

export interface OnsiteSetupOssCustomTab {
  icon: string;
  id: string;
  name: string;
  position: number;
  type: OssCustomTabTypes;
}

export enum SessionAvailabilityCacheStrategyEnum {
  no_cache = 'no_cache',
  time_to_live = 'time_to_live',
  stale_while_revalidate = 'stale_while_revalidate',
}

export interface SessionAvailabilityPlanConfigDTO {
  plan_id: number;
  strategy: SessionAvailabilityCacheStrategyEnum;
  timeout_in_seconds?: number;
}

export enum ContactInformationRequirementEnum {
  DISABLED = 'disabled',
  OPTIONAL = 'optional',
  REQUIRED = 'required',
}

export enum ContactInformationFieldEnum {
  EMAIL = 'email',
  PHONE = 'phone',
}

export enum ContactInformationOrderableFieldEnum {
  FIRST_NAME = 'first_name',
  LAST_NAME = 'last_name',
  EMAIL = 'email',
  PHONE = 'phone',
}

export interface ContactInformationSetup {
  fields: ContactInformationFieldEnum[];
  requirement_on_current_day: ContactInformationRequirementEnum;
  fields_order?: ContactInformationOrderableFieldEnum[] | null;
}

export interface OnsiteSetupPlace {
  city_id: number;
  country_iso_code_2?: string;
  id: number;
  name: string;
}

export interface OnsiteSetupPaymentConfigurationTerminal {
  external_id: string;
  id: string;
  label: string | null;
  ip_address?: string | null;
}

export interface OnsiteSetupPaymentConfigurationMethod {
  code: string;
  default_display_name_key: string;
  icon_url: string | null;
  name: string | null;
}

export interface OnsiteSetupPaymentConfigurationIntegratedGateway {
  id: string;
  provider: PaymentConfigurationGatewayProvider;
  provider_config: ProviderConfigDto | null;
  selected_methods: OnsiteSetupPaymentConfigurationMethod[];
  terminals: OnsiteSetupPaymentConfigurationTerminal[];
}

export type OnsiteSetupPaymentConfigurationQuickAction =
  | { code: string; provider: PaymentConfigurationMethodGatewayProvider; type: 'payment_method' }
  | { type: 'multi_flow_checkout' };

export interface OnsiteSetupPaymentConfigurationCheckout {
  multi_flow: { enabled: boolean; flows: PaymentConfigurationCheckoutFlow[] };
  quick_actions?: OnsiteSetupPaymentConfigurationQuickAction[];
}

export interface OnsiteSetupPaymentConfiguration {
  allow_split_payments: boolean;
  checkout?: OnsiteSetupPaymentConfigurationCheckout;
  delegated_methods: OnsiteSetupPaymentConfigurationMethod[];
  id: string;
  integrated_gateway: OnsiteSetupPaymentConfigurationIntegratedGateway | null;
  location_id: string;
  name: string;
}

export interface OnsiteSetupPaymentConfigurationAssignment {
  paymentConfigurationId: string | null;
  selectedTerminalIds: string[];
  integratedGatewayProvider?: PaymentConfigurationGatewayProvider | null;
}

export interface OnsiteSetupDTO {
  access_control_setup_id?: string;
  allow_delegated_payment: boolean;
  cash_registers: string[];
  contact_information_setup?: ContactInformationSetup;
  custom_tab_id?: string;
  custom_tabs?: OnsiteSetupOssCustomTab[];
  cutter_type?: CutterTypeEnum;
  hardware_type?: HardwareTypeEnum;
  device_type: OnsiteDeviceType;
  /** Every fiscal group row of the place's country by method code; `null` when the place's country is not fiscalised. */
  fiscal_groups?: Readonly<Record<string, string>> | null;
  id: string;
  is_hidden?: boolean;
  location_id: string;
  max_purchasable_days: number;
  name: string;
  obo_flow_type?: OboFlowTypeEnum;
  obo_payment_gateway: PaymentCheckoutET | 'undefined';
  obo_payment_terminal_ids: string[];
  obo_printer_type?: OboPrinterTypeEnum;
  receipt_printer_type?: ReceiptPrinterType;
  paper_type?: PaperTypeEnum;
  partner_id?: number;
  payment_configuration?: OnsiteSetupPaymentConfiguration | null;
  payment_extra_information?: string;
  payment_methods?: Array<PaymentMethodSetup>;
  print_configuration_bundle_id?: string | null;
  place?: OnsiteSetupPlace;
  place_id?: number;
  preset_coupon_codes: string[];
  price_viewer?: PriceViewerEnum;
  print_tickets_combined_for_plans?: number[];
  prioritized_main_plans?: number[];
  products_holder_plan_id?: number;
  retail_setup_id?: string;
  second_screen_configuration?: SecondScreenConfiguration | null;
  second_screen_configuration_id?: string | null;
  selected_terminal_ids?: string[];
  shift_max_hours_open?: number;
  shift_strategy?: ShiftStrategyEnum;
  show_sold_out_sessions: boolean;
  square_location_id?: string;
  square_application_id?: string;
  ticket_selector_type?: TicketSelectorTypeEnum;
  ticket_validation?: TicketValidationTypeEnum;
  user_id?: number;
  validation_profiles?: string[];
  warehouse_id?: string;
  allow_split_payments?: boolean;
  can_override_capacities?: boolean;
  channel_id: string;
  session_availability_cache_strategy?: SessionAvailabilityCacheStrategyEnum;
  session_availability_cache_timeout_in_seconds?: number;
  session_availability_plan_configs?: SessionAvailabilityPlanConfigDTO[];
}

export type OnsiteSetup = OnsiteSetupDTO;

export interface OnsiteSetupBody {
  access_control_setup_id?: string;
  cash_register_ids: string[];
  contact_information_setup?: ContactInformationSetup;
  cutter_type?: CutterTypeEnum;
  device_type?: OnsiteDeviceType;
  hardware_type?: HardwareTypeEnum;
  is_hidden?: boolean;
  max_purchasable_days: number;
  name: string;
  obo_flow_type?: OboFlowTypeEnum;
  obo_printer_type?: OboPrinterTypeEnum;
  receipt_printer_type?: ReceiptPrinterType;
  paper_type?: PaperTypeEnum;
  print_configuration_bundle_id?: string | null;
  preset_coupon_codes: string[] | undefined;
  price_viewer?: PriceViewerEnum;
  print_tickets_combined_for_plans?: number[];
  prioritized_main_plans?: number[];
  products_holder_plan_id?: number;
  retail_setup_id?: string;
  /** Box office only. Omitted on update keeps the stored value, `null` clears it. */
  second_screen_configuration_id?: string | null;
  shift_max_hours_open?: number;
  shift_strategy?: ShiftStrategyEnum;
  show_sold_out_sessions: boolean;
  ticket_selector_type?: TicketSelectorTypeEnum;
  ticket_validation?: TicketValidationTypeEnum;
  validation_profiles?: string[];
  warehouse_id?: string;
  can_override_capacities?: boolean;
  channel_id?: string;
  session_availability_cache_strategy?: SessionAvailabilityCacheStrategyEnum;
  session_availability_cache_timeout_in_seconds?: number;
  session_availability_plan_configs?: SessionAvailabilityPlanConfigDTO[];
}

export type OnsiteSetupBodyWithPaymentConfigurationAssignment = OnsiteSetupBody & {
  payment_configuration_id?: string | null;
  selected_terminal_ids?: string[];
};

export type OnsiteSetupQuery = {
  cityId?: number;
  deviceType?: OnsiteDeviceType;
  includeHidden?: boolean;
  itemsPerPage?: number;
  page?: number;
  placeId?: number;
};

export type SelectableOnsiteSetups = {
  hasHiddenSetupsOnly: boolean;
  setups: Array<OnsiteSetup>;
};
