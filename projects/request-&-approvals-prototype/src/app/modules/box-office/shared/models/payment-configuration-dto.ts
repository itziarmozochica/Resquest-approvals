import {
  PaymentConfigurationCheckoutFlow,
  PaymentConfigurationGatewayProvider,
  PaymentConfigurationMethodGatewayProvider,
} from './payment-configuration';

export interface SquareProviderConfigDto {
  application_id: string;
  location_id: string;
}

export interface PayhereProviderConfigDto {
  merchant_id: string;
}

export interface AdyenLocalProviderConfigDto {
  adyen_merchant_account: string;
  key_identifier: string | null;
  key_version: number | null;
  // Request-only, and omitted when an already-stored key must be kept.
  key_passphrase?: string;
  tap_to_pay_enabled?: boolean;
}

export type ProviderConfigDto = SquareProviderConfigDto | PayhereProviderConfigDto | AdyenLocalProviderConfigDto;

export interface PaymentConfigurationTerminalDto {
  external_id: string;
  id: string;
  ip_address: string | null;
  is_active: boolean;
  label: string | null;
}

export interface PaymentConfigurationMethodDto {
  default_display_name_key: string;
  id: string;
  is_active: boolean;
  method_code: string;
}

export interface PaymentConfigurationGatewayDto {
  id: string;
  methods: PaymentConfigurationMethodDto[];
  provider: PaymentConfigurationGatewayProvider;
  provider_config: ProviderConfigDto | null;
  terminals: PaymentConfigurationTerminalDto[];
}

export interface PaymentConfigurationAssignedOnsiteSetupDto {
  id: string;
  name: string;
}

export interface PaymentConfigurationDetailDto {
  allow_split_payments: boolean;
  assigned_to_onsite_setups: PaymentConfigurationAssignedOnsiteSetupDto[];
  country_code: string;
  created_at: string;
  delegated_methods: PaymentConfigurationMethodDto[];
  gateways: PaymentConfigurationGatewayDto[];
  id: string;
  name: string;
}

export interface PaymentConfigurationSummaryDto {
  assigned_to_onsite_setup_count: number;
  created_at: string;
  id: string;
  integrated_gateway_provider: PaymentConfigurationGatewayProvider | null;
  method_count: number;
  name: string;
  terminal_count: number;
  updated_at: string;
}

export interface PaymentConfigurationTerminalBodyDto {
  external_id: string;
  ip_address: string | null;
  label?: string;
}

export interface PaymentConfigurationMethodBodyDto {
  gateway_provider: PaymentConfigurationMethodGatewayProvider;
  method_code: string;
}

export interface PaymentConfigurationBodyDto {
  allow_split_payments: boolean;
  integrated_gateway_provider: PaymentConfigurationGatewayProvider | null;
  methods: PaymentConfigurationMethodBodyDto[];
  name: string;
  terminals: PaymentConfigurationTerminalBodyDto[];
  provider_config?: ProviderConfigDto;
}

export interface PaymentConfigurationWriteResultTerminalDto {
  external_id: string;
  id: string;
  label: string | null;
}

export interface PaymentConfigurationWriteResultDto {
  allow_split_payments: boolean;
  id: string;
  integrated_gateway_provider: PaymentConfigurationGatewayProvider | null;
  methods: PaymentConfigurationMethodBodyDto[];
  name: string;
  terminals: PaymentConfigurationWriteResultTerminalDto[];
}

export interface PaymentConfigurationMethodReferenceDto {
  code: string;
  provider: PaymentConfigurationMethodGatewayProvider;
}

export type PaymentConfigurationQuickActionDto =
  | ({ type: 'payment_method' } & PaymentConfigurationMethodReferenceDto)
  | { type: 'multi_flow_checkout' };

export interface PaymentConfigurationCheckoutDto {
  multi_flow: { enabled: boolean; flows: PaymentConfigurationCheckoutFlow[] };
  payment_methods: PaymentConfigurationMethodReferenceDto[];
  quick_actions: PaymentConfigurationQuickActionDto[];
}

export interface PaymentConfigurationV2MethodBodyDto {
  code: string;
}

export interface PaymentConfigurationV2MethodDto extends PaymentConfigurationV2MethodBodyDto {
  display_name_key: string;
  is_active: boolean;
}

export interface PaymentConfigurationV2GatewayBodyDto {
  methods: PaymentConfigurationV2MethodBodyDto[];
  provider: PaymentConfigurationGatewayProvider;
  terminals: PaymentConfigurationTerminalBodyDto[];
  config?: ProviderConfigDto;
}

export interface PaymentConfigurationV2GatewayDto {
  config: ProviderConfigDto | null;
  methods: PaymentConfigurationV2MethodDto[];
  provider: PaymentConfigurationGatewayProvider;
  terminals: PaymentConfigurationTerminalDto[];
}

export interface PaymentConfigurationV2BodyDto {
  allow_split_payments: boolean;
  checkout: PaymentConfigurationCheckoutDto;
  delegated: { methods: PaymentConfigurationV2MethodBodyDto[] };
  gateways: PaymentConfigurationV2GatewayBodyDto[];
  name: string;
  version?: number;
}

export interface PaymentConfigurationV2Dto {
  assigned_to_onsite_setups: PaymentConfigurationAssignedOnsiteSetupDto[];
  checkout: PaymentConfigurationCheckoutDto;
  created_at: string;
  delegated: { methods: PaymentConfigurationV2MethodDto[] };
  gateways: PaymentConfigurationV2GatewayDto[];
  id: string;
  name: string;
  updated_at: string;
  version: number;
  allow_split_payments?: boolean;
}

export interface PaymentConfigurationCatalogMethodDto {
  code: string;
  default_display_name_key: string;
  name: string | null;
}

export interface PaymentConfigurationCatalogProviderDto {
  methods: PaymentConfigurationCatalogMethodDto[];
  provider: PaymentConfigurationGatewayProvider;
}

export interface PaymentConfigurationAvailableMethodsCatalogDto {
  country_code: string;
  delegated_methods: PaymentConfigurationCatalogMethodDto[];
  providers: PaymentConfigurationCatalogProviderDto[];
}
