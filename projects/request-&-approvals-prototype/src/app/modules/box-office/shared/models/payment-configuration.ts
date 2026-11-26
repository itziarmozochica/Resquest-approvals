export type PaymentConfigurationGatewayProvider = 'adyen' | 'adyen_local' | 'square' | 'payhere';

export type PaymentConfigurationMethodGatewayProvider = PaymentConfigurationGatewayProvider | 'delegated';
export interface SquareProviderConfig {
  applicationId: string;
  squareLocationId: string;
}

export interface PayhereProviderConfig {
  merchantId: string;
}

// keyPassphrase is write-only: never returned, so null when read back.
export interface AdyenLocalProviderConfig {
  adyenMerchantAccount: string;
  keyIdentifier: string | null;
  keyPassphrase: string | null;
  keyVersion: number | null;
  tapToPayEnabled: boolean;
}

export type PaymentConfigurationProviderConfig = SquareProviderConfig | PayhereProviderConfig | AdyenLocalProviderConfig;

export interface PaymentConfigurationTerminal {
  externalId: string;
  id: string;
  ipAddress: string | null;
  isActive: boolean;
  label: string | null;
}

export interface PaymentConfigurationGatewayMethod {
  defaultDisplayNameKey: string;
  id: string;
  isActive: boolean;
  methodCode: string;
}

export type PaymentConfigurationDelegatedMethod = PaymentConfigurationGatewayMethod;

export interface PaymentConfigurationGateway {
  id: string;
  methods: PaymentConfigurationGatewayMethod[];
  provider: PaymentConfigurationGatewayProvider;
  providerConfig: PaymentConfigurationProviderConfig | null;
  terminals: PaymentConfigurationTerminal[];
}

export interface PaymentConfigurationAssignedOnsiteSetup {
  id: string;
  name: string;
}

export interface PaymentConfigurationDetail {
  allowSplitPayments: boolean;
  assignedToOnsiteSetups: PaymentConfigurationAssignedOnsiteSetup[];
  countryCode: string;
  createdAt: string;
  delegatedMethods: PaymentConfigurationDelegatedMethod[];
  gateways: PaymentConfigurationGateway[];
  id: string;
  name: string;
}

export interface PaymentConfigurationSummary {
  assignedToOnsiteSetupCount: number;
  createdAt: string;
  id: string;
  integratedGatewayProvider: PaymentConfigurationGatewayProvider | null;
  methodCount: number;
  name: string;
  terminalCount: number;
  updatedAt: string;
}

export type PaymentConfigurationCheckoutFlow = 'full_payment' | 'split_equally' | 'pay_by_item' | 'custom_split';

export const PAYMENT_CONFIGURATION_DIRECT_PAYMENT_BUTTON_LIMIT = 2;

export type PaymentConfigurationQuickAction =
  | ({ type: 'payment_method' } & PaymentConfigurationMethodInput)
  | { type: 'multi_flow_checkout' };

export interface PaymentConfigurationConfiguredMethod extends PaymentConfigurationMethodInput {
  displayNameKey: string;
}

export interface PaymentConfigurationCheckout {
  multiFlow: { enabled: boolean; flows: PaymentConfigurationCheckoutFlow[] };
  paymentMethods: PaymentConfigurationMethodInput[];
  quickActions: PaymentConfigurationQuickAction[];
}

export type PaymentConfigurationV2Method = Omit<PaymentConfigurationGatewayMethod, 'id'>;

export interface PaymentConfigurationV2Gateway extends Omit<PaymentConfigurationGateway, 'id' | 'methods'> {
  methods: PaymentConfigurationV2Method[];
}

export interface PaymentConfigurationV2 {
  allowSplitPayments: boolean;
  assignedToOnsiteSetups: PaymentConfigurationAssignedOnsiteSetup[];
  checkout: PaymentConfigurationCheckout;
  createdAt: string;
  delegatedMethods: PaymentConfigurationV2Method[];
  gateways: PaymentConfigurationV2Gateway[];
  id: string;
  name: string;
  version: number;
}

export interface PaymentConfigurationTerminalInput {
  externalId: string;
  ipAddress: string | null;
  label?: string;
}

export interface PaymentConfigurationMethodInput {
  gatewayProvider: PaymentConfigurationMethodGatewayProvider;
  methodCode: string;
}

export interface PaymentConfigurationInput {
  allowSplitPayments: boolean;
  integratedGatewayProvider: PaymentConfigurationGatewayProvider | null;
  methods: PaymentConfigurationMethodInput[];
  name: string;
  providerConfig: PaymentConfigurationProviderConfig | null;
  terminals: PaymentConfigurationTerminalInput[];
}

export interface PaymentConfigurationV2Input extends PaymentConfigurationInput {
  checkout: PaymentConfigurationCheckout;
  version: number | null;
}

export interface PaymentConfigurationWriteResultTerminal {
  externalId: string;
  id: string;
  label: string | null;
}

export interface PaymentConfigurationWriteResult {
  allowSplitPayments: boolean;
  id: string;
  integratedGatewayProvider: PaymentConfigurationGatewayProvider | null;
  methods: PaymentConfigurationMethodInput[];
  name: string;
  terminals: PaymentConfigurationWriteResultTerminal[];
}

export interface PaymentConfigurationListQuery {
  includeDeleted?: boolean;
  itemsPerPage?: number;
  page?: number;
  placeId?: number;
}

export interface PaymentConfigurationCatalogMethod {
  code: string;
  defaultDisplayNameKey: string;
  name: string;
}

export interface PaymentConfigurationCatalogProvider {
  methods: PaymentConfigurationCatalogMethod[];
  provider: PaymentConfigurationGatewayProvider;
}

export interface PaymentConfigurationAvailableMethodsCatalog {
  countryCode: string;
  delegatedMethods: PaymentConfigurationCatalogMethod[];
  providers: PaymentConfigurationCatalogProvider[];
}
