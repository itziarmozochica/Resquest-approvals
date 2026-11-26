import { WebViewTypeMessage } from '@fz-original/app/shared/services/webview-messenger/models/web-view-type-message.model';
import { environment } from '@fz-original/environments/environment';

import { WebViewMessage } from '@feverup/ts-webview';

import type { TapToPayTarget } from './tap-to-pay.model';

const LOCAL_TERMINAL_PAYMENT_GATEWAY = 'adyenLocal';

const LOCAL_TERMINAL_NEXO_PORT = 8443;

export type LocalTerminalEnvironment = 'LIVE' | 'TEST';

export function localTerminalEnvironment(): LocalTerminalEnvironment {
  return environment.production ? 'LIVE' : 'TEST';
}

export interface LocalTerminalConfig {
  ipAddress: string;
  poiId: string;
  saleId: string;
}

export interface LocalTerminalPaymentRequest {
  /** Major units. */
  amount: number;
  currency: string;
  terminal: LocalTerminalConfig | TapToPayTarget;
}

export type LocalTerminalPaymentResult =
  | {
      authorizedAmount: number;
      currency: string;
      kind: 'approved';
      terminalReference: string;
    }
  | { kind: 'declined'; errorCondition?: string; refusalReason?: string }
  | { kind: 'cancelled' }
  | { kind: 'unknown' };

interface ConfigureLocalTerminalPayload {
  environment: LocalTerminalEnvironment;
  ip: string;
  paymentGateway: string;
  poiId: string;
  port: number;
  saleId: string;
  scheme: string;
}

interface LocalTerminalCheckoutPayload {
  data: { amount: number; currencyCode: string };
  paymentGateway: string;
}

export class ConfigureLocalTerminalMessage implements WebViewMessage<ConfigureLocalTerminalPayload> {
  readonly payload: ConfigureLocalTerminalPayload;
  readonly type = WebViewTypeMessage.payment_configure_terminal;

  constructor(terminal: LocalTerminalConfig, environment: LocalTerminalEnvironment) {
    this.payload = {
      environment,
      ip: terminal.ipAddress,
      paymentGateway: LOCAL_TERMINAL_PAYMENT_GATEWAY,
      poiId: terminal.poiId,
      port: LOCAL_TERMINAL_NEXO_PORT,
      saleId: terminal.saleId,
      scheme: 'https',
    };
  }
}

export class LocalTerminalCheckoutMessage implements WebViewMessage<LocalTerminalCheckoutPayload> {
  readonly payload: LocalTerminalCheckoutPayload;
  readonly type = WebViewTypeMessage.payment_checkout;

  constructor(amount: number, currencyCode: string, paymentGateway: string = LOCAL_TERMINAL_PAYMENT_GATEWAY) {
    this.payload = { data: { amount, currencyCode }, paymentGateway };
  }
}

export class LocalTerminalCancelMessage implements WebViewMessage<Record<string, never>> {
  readonly payload: Record<string, never> = {};
  readonly type = WebViewTypeMessage.payment_cancel;
}

export class AdyenLocalConfiguration {
  constructor(
    public devicesIds: string[],
    /** By POIID. */
    public ipAddresses: Record<string, string>,
    public paymentConfigurationId: string,
  ) {}

  clone(): AdyenLocalConfiguration {
    return new AdyenLocalConfiguration([...this.devicesIds], { ...this.ipAddresses }, this.paymentConfigurationId);
  }

  isEqual(other?: AdyenLocalConfiguration): boolean {
    return (
      other !== undefined &&
      this.paymentConfigurationId === other.paymentConfigurationId &&
      this.devicesIds.length === other.devicesIds.length &&
      this.devicesIds.every((id, index) => id === other.devicesIds[index] && this.ipAddresses[id] === other.ipAddresses[id])
    );
  }
}
