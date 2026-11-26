import { WebViewMessage } from '@feverup/ts-webview';

import type { LocalTerminalEnvironment } from '../../../../payments/models/local-terminal-payment.model';
import { WebViewTypeMessage } from '../../../../shared/services/webview-messenger/models/web-view-type-message.model';

export const ADYEN_LOCAL_PAYMENT_GATEWAY = 'adyenLocal';

/**
 * Every reply the Box Office app sends for an adyen_local device message (B2BO-8471): an HTTP-like
 * `status`, a nullable `data`, and on failure an `errorCode` from the closed set the app publishes.
 * `data` is typed nullable on purpose, so an unwrap has to be guarded instead of trusting the shape.
 */
export interface AdyenLocalDeviceResult<T> {
  paymentGateway: string;
  status: number;
  data?: T | null;
  errorCode?: string | null;
}

export interface AdyenLocalDevicePublicKey {
  algorithm: string;
  publicKey: string;
}

export interface AdyenLocalIdentifiedTerminal {
  poiId: string;
}

export interface AdyenLocalStoredTerminalKey {
  keyVersion: number;
}

export interface AdyenLocalTerminalKeyStatus {
  keyIdentifier: string | null;
  keyVersion: number | null;
  poiId: string | null;
  stored: boolean;
}

interface AdyenLocalDevicePayload<T> {
  paymentGateway: string;
  data?: T;
}

export interface AdyenLocalIdentifyTerminalPayload {
  environment: LocalTerminalEnvironment;
  ip: string;
  port: number;
}

export interface AdyenLocalStoreTerminalKeyPayload {
  ciphertext: string;
  envelopeVersion: number;
  expectedKeyVersion: number;
  iv: string;
  wrappedKey: string;
}

export class AdyenLocalDevicePublicKeyMessage implements WebViewMessage<AdyenLocalDevicePayload<never>> {
  readonly payload: AdyenLocalDevicePayload<never> = { paymentGateway: ADYEN_LOCAL_PAYMENT_GATEWAY };
  readonly type = WebViewTypeMessage.payment_device_public_key;
}

export class AdyenLocalIdentifyTerminalMessage implements WebViewMessage<AdyenLocalDevicePayload<AdyenLocalIdentifyTerminalPayload>> {
  readonly payload: AdyenLocalDevicePayload<AdyenLocalIdentifyTerminalPayload>;
  readonly type = WebViewTypeMessage.payment_identify_terminal;

  constructor(data: AdyenLocalIdentifyTerminalPayload) {
    this.payload = { data, paymentGateway: ADYEN_LOCAL_PAYMENT_GATEWAY };
  }
}

export class AdyenLocalStoreTerminalKeyMessage implements WebViewMessage<AdyenLocalDevicePayload<AdyenLocalStoreTerminalKeyPayload>> {
  readonly payload: AdyenLocalDevicePayload<AdyenLocalStoreTerminalKeyPayload>;
  readonly type = WebViewTypeMessage.payment_store_terminal_key;

  constructor(data: AdyenLocalStoreTerminalKeyPayload) {
    this.payload = { data, paymentGateway: ADYEN_LOCAL_PAYMENT_GATEWAY };
  }
}

export class AdyenLocalTerminalKeyStatusMessage implements WebViewMessage<AdyenLocalDevicePayload<never>> {
  readonly payload: AdyenLocalDevicePayload<never> = { paymentGateway: ADYEN_LOCAL_PAYMENT_GATEWAY };
  readonly type = WebViewTypeMessage.payment_terminal_key_status;
}

export interface AdyenLocalDeviceEnrolmentInput {
  devicePublicKey: string;
  terminalExternalId: string;
  terminalIpAddress: string;
}

/** The sealed NEXO key partners returns for the enrolled device (D1): opaque to JavaScript. */
export interface AdyenLocalSealedKey {
  ciphertext: string;
  deviceSerialNumber?: string;
  envelopeVersion: number;
  iv: string;
  keyVersion: number;
  wrappedKey: string;
}
