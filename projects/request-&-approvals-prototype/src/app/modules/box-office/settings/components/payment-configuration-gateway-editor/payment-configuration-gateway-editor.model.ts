import {
  PaymentConfigurationGatewayProvider,
  PaymentConfigurationProviderConfig,
  PaymentConfigurationTerminalInput,
} from '../../../shared/models/payment-configuration';

export enum PaymentConfigurationAdyenLocalMode {
  Terminals = 'terminals',
  TapToPay = 'tap_to_pay',
}

export interface PaymentConfigurationGatewayEditorState {
  provider: PaymentConfigurationGatewayProvider | null;
  providerConfig: PaymentConfigurationProviderConfig | null;
  selectedMethodCodes: string[];
  terminals: PaymentConfigurationTerminalInput[];
}

export interface PaymentConfigurationGatewayEditorChange {
  state: PaymentConfigurationGatewayEditorState;
  valid: boolean;
}
