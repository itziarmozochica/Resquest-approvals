import { inject, Injectable } from '@angular/core';

import { isSemanticVersionGreaterOrEqual } from '@fz-original/app/app/utils/version.util';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { localTerminalEnvironment } from '@fz-original/app/payments/models/local-terminal-payment.model';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { MessageType, WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { defer, Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

import { WebViewMessage } from '@feverup/ts-webview';

import {
  AdyenLocalDevicePublicKey,
  AdyenLocalDevicePublicKeyMessage,
  AdyenLocalDeviceResult,
  AdyenLocalIdentifiedTerminal,
  AdyenLocalIdentifyTerminalMessage,
  AdyenLocalSealedKey,
  AdyenLocalStoredTerminalKey,
  AdyenLocalStoreTerminalKeyMessage,
  AdyenLocalTerminalKeyStatus,
  AdyenLocalTerminalKeyStatusMessage,
} from '../../models/adyen-local-device';
import { AdyenLocalConnectDeviceError, AdyenLocalConnectDeviceFailure } from './adyen-local-connect-device.error';

/**
 * The closed set of `errorCode` values the Box Office app answers with (B2BO-8471). The three
 * envelope failures collapse into one operator-visible failure because the operator's move is the
 * same for all of them; the raw code still travels to Datadog.
 */
const BRIDGE_ERROR_CODE_FAILURES: Record<string, AdyenLocalConnectDeviceFailure> = {
  decrypt_failed: 'key_storage_failed',
  envelope_unsupported: 'key_storage_failed',
  // kiosk-android#210 answers these two beyond the B2BO-8471 contract.
  invalid_request: 'unexpected',
  key_version_mismatch: 'key_storage_failed',
  keystore_unavailable: 'device_keystore_unavailable',
  probe_failed: 'unexpected',
  provisioning_failed: 'device_keystore_unavailable',
  storage_failed: 'key_storage_failed',
  terminal_not_supported: 'terminal_not_supported',
  terminal_unreachable: 'terminal_unreachable',
  untrusted_certificate: 'untrusted_certificate',
};

const TERMINAL_NEXO_PORT = 8443;

/**
 * The four connect-device messages of B2BO-8471, behind one seam. Nothing else in FeverZone talks
 * to the Box Office app about local terminals, so when the real messages land only this file moves.
 *
 * An app that does not implement a message never answers it, so every wait is bounded and a silent
 * bridge surfaces as `bridge_unavailable` instead of a request that hangs forever.
 */
@Injectable({
  providedIn: 'root',
})
export class AdyenLocalDeviceBridgeService {
  /** The Box Office app version that ships the connect-device messages (B2BO-8471). */
  static readonly connectDeviceMinVersion = '1.14.0';
  static readonly probeTimeoutMs = 20_000;
  static readonly replyTimeoutMs = 10_000;

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #webviewMessengerService = inject(WebviewMessengerService);

  identifyTerminal(ipAddress: string): Observable<AdyenLocalIdentifiedTerminal> {
    return this.#request<AdyenLocalIdentifiedTerminal>(
      new AdyenLocalIdentifyTerminalMessage({ environment: localTerminalEnvironment(), ip: ipAddress, port: TERMINAL_NEXO_PORT }),
      MessageType.AdyenLocalIdentifyTerminalResult,
      AdyenLocalDeviceBridgeService.probeTimeoutMs,
    );
  }

  requestPublicKey(): Observable<AdyenLocalDevicePublicKey> {
    return this.#request<AdyenLocalDevicePublicKey>(
      new AdyenLocalDevicePublicKeyMessage(),
      MessageType.AdyenLocalDevicePublicKeyResult,
      AdyenLocalDeviceBridgeService.replyTimeoutMs,
    );
  }

  storeTerminalKey(sealedKey: AdyenLocalSealedKey): Observable<AdyenLocalStoredTerminalKey> {
    return this.#request<AdyenLocalStoredTerminalKey>(
      new AdyenLocalStoreTerminalKeyMessage({
        ciphertext: sealedKey.ciphertext,
        envelopeVersion: sealedKey.envelopeVersion,
        expectedKeyVersion: sealedKey.keyVersion,
        iv: sealedKey.iv,
        wrappedKey: sealedKey.wrappedKey,
      }),
      MessageType.AdyenLocalStoreTerminalKeyResult,
      AdyenLocalDeviceBridgeService.replyTimeoutMs,
    );
  }

  /**
   * Only a dual screen can connect a device (D22): the flow needs the native Keystore and the
   * terminal probe. Gated exactly like `printImagesMinVersion`, on `versionApp` from the WebView.
   */
  supportsConnectDevice(): boolean {
    const versionApp: string | undefined = this.#dualScreenStorageService.getData()?.versionApp;
    return versionApp !== undefined && isSemanticVersionGreaterOrEqual(versionApp, AdyenLocalDeviceBridgeService.connectDeviceMinVersion);
  }

  terminalKeyStatus(): Observable<AdyenLocalTerminalKeyStatus> {
    return this.#request<AdyenLocalTerminalKeyStatus>(
      new AdyenLocalTerminalKeyStatusMessage(),
      MessageType.AdyenLocalTerminalKeyStatusResult,
      AdyenLocalDeviceBridgeService.replyTimeoutMs,
    );
  }

  #failureFor(result: AdyenLocalDeviceResult<unknown>): AdyenLocalConnectDeviceFailure {
    const errorCode = result.errorCode ?? '';
    return BRIDGE_ERROR_CODE_FAILURES[errorCode] ?? 'unexpected';
  }

  /**
   * `defer` keeps the message from being sent until someone subscribes, and the listener is piped
   * before the send so a synchronous reply from the app cannot be missed.
   */
  #request<T>(message: WebViewMessage<unknown>, resultType: MessageType, timeoutMs: number): Observable<T> {
    return defer(() => {
      const result$ = this.#webviewMessengerService.observeOnce<AdyenLocalDeviceResult<T>>(resultType).pipe(timeout(timeoutMs));
      this.#webviewMessengerService.sendWebViewMessage(message);
      return result$;
    }).pipe(
      map(result => this.#unwrap(result, message.type)),
      catchError((error: unknown) => {
        if (error instanceof AdyenLocalConnectDeviceError) {
          return throwError(() => error);
        }
        // Nothing answered inside the window: an app without this message, or a dead bridge.
        this.#datadogLogService.logError('[AdyenLocalDeviceBridge] No reply from the Box Office app', {
          error: JSON.stringify(error),
          message_type: message.type,
          timeout_ms: timeoutMs,
        });
        console.warn('[AdyenLocalDeviceBridge] no reply', message.type, timeoutMs, error);
        return throwError(() => new AdyenLocalConnectDeviceError('bridge_unavailable', error));
      }),
    );
  }

  #unwrap<T>(result: AdyenLocalDeviceResult<T>, messageType: string): T {
    const data = result.data ?? null;
    if (result.status !== 200 || data === null) {
      const failure = this.#failureFor(result);
      this.#datadogLogService.logError('[AdyenLocalDeviceBridge] The Box Office app rejected a connect-device message', {
        error_code: result.errorCode ?? null,
        failure,
        message_type: messageType,
        status: result.status,
      });
      console.warn('[AdyenLocalDeviceBridge] rejected', messageType, result.status, result.errorCode ?? null, failure);
      throw new AdyenLocalConnectDeviceError(failure, result);
    }
    return data;
  }
}
