import { InjectionToken } from '@angular/core';

import { WebViewTypeMessage } from '@fz-original/app/shared/services/webview-messenger/models/web-view-type-message.model';

import { WebViewMessage } from '@feverup/ts-webview';

export const TAP_TO_PAY_PAYMENT_GATEWAY = 'adyenTapToPay';

export type TapToPayDeviceType = 'dualScreen';

export const TAP_TO_PAY_DEVICE_TYPE = new InjectionToken<() => TapToPayDeviceType | undefined>('TAP_TO_PAY_DEVICE_TYPE', {
  providedIn: 'root',
  factory: () => (): TapToPayDeviceType | undefined => undefined,
});

export const TAP_TO_PAY_DEVICE_ID = 'tap-to-pay';

export function isTapToPayDeviceId(deviceId: string | null | undefined): boolean {
  return deviceId === TAP_TO_PAY_DEVICE_ID;
}

export function toPrintDeviceId(deviceId: string | undefined): string | undefined {
  return isTapToPayDeviceId(deviceId) ? undefined : deviceId;
}

export const TAP_TO_PAY_SESSION_ERROR_NO_BOX_OFFICE = 'no_box_office';
export const TAP_TO_PAY_SESSION_ERROR_NOT_AVAILABLE = 'tap_to_pay_not_available';
export const TAP_TO_PAY_SESSION_ERROR_INVALID_REQUEST = 'invalid_request';
export const TAP_TO_PAY_SESSION_ERROR_BACKEND_UNREACHABLE = 'backend_unreachable';
export const TAP_TO_PAY_SESSION_ERROR_BACKEND_TIMEOUT = 'backend_timeout';
export const TAP_TO_PAY_SESSION_ERROR_INVALID_RESPONSE = 'invalid_session_response';
export const TAP_TO_PAY_SESSION_ERROR_UNEXPECTED = 'unexpected';

export interface TapToPayTarget {
  saleId: string;
  tapToPay: true;
}

export interface TapToPayBridgeResult<T> {
  data: T | null;
  requestId: string;
  status: number;
  errorCode?: string | null;
  paymentGateway?: string;
}

export interface TapToPayInstallation {
  installationId: string;
}

export interface TapToPaySessionRequest {
  data: { setupToken: string } | null;
  requestId: string;
  paymentGateway?: string;
}

export interface TapToPaySession {
  installationId: string;
  sdkData: string;
}

export interface TapToPaySessionAnswer {
  data: TapToPaySession | null;
  errorCode: string | null;
  requestId: string;
  status: number;
}

export class TapToPaySessionError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: string,
  ) {
    super(`Tap to Pay session refused: ${status} ${errorCode}`);
    this.name = 'TapToPaySessionError';
  }
}

export class TapToPayInstallationError extends Error {
  constructor(
    readonly reason: 'no_reply' | 'rejected',
    readonly errorCode: string | null = null,
  ) {
    super(`Tap to Pay installation unavailable: ${reason}`);
    this.name = 'TapToPayInstallationError';
  }
}

export class TapToPayUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'TapToPayUnavailableError';
  }
}

interface ConfigureTapToPayPayload {
  paymentGateway: string;
  saleId: string;
  deviceType?: TapToPayDeviceType;
}

interface TapToPayInstallationPayload {
  paymentGateway: string;
  requestId: string;
}

interface TapToPaySessionResultPayload extends TapToPaySessionAnswer {
  paymentGateway: string;
}

export function isTapToPayTarget(target: object): target is TapToPayTarget {
  return 'tapToPay' in target && target.tapToPay === true;
}

export class ConfigureTapToPayMessage implements WebViewMessage<ConfigureTapToPayPayload> {
  readonly payload: ConfigureTapToPayPayload;
  readonly type = WebViewTypeMessage.payment_configure_terminal;

  constructor(saleId: string, deviceType: TapToPayDeviceType | undefined) {
    this.payload = { paymentGateway: TAP_TO_PAY_PAYMENT_GATEWAY, saleId, ...(deviceType !== undefined && { deviceType }) };
  }
}

export class TapToPayInstallationMessage implements WebViewMessage<TapToPayInstallationPayload> {
  readonly payload: TapToPayInstallationPayload;
  readonly type = WebViewTypeMessage.payment_tap_to_pay_installation;

  constructor(requestId: string) {
    this.payload = { paymentGateway: TAP_TO_PAY_PAYMENT_GATEWAY, requestId };
  }
}

export class TapToPaySessionResultMessage implements WebViewMessage<TapToPaySessionResultPayload> {
  readonly payload: TapToPaySessionResultPayload;
  readonly type = WebViewTypeMessage.payment_tap_to_pay_session_result;

  constructor(answer: TapToPaySessionAnswer) {
    this.payload = { ...answer, paymentGateway: TAP_TO_PAY_PAYMENT_GATEWAY };
  }
}
