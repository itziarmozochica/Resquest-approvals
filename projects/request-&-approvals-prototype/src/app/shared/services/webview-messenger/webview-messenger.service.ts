import { inject, Injectable, NgZone } from '@angular/core';

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { GuestBridge, WebViewMessage, WebViewMessenger } from '@feverup/ts-webview';

import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { KioskPrinterStatusEvent } from '../../../core/tracking/core/events/kiosk-printer-status';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { AndroidMessage } from './models/android-message.model';
import { WebViewTypeMessage } from './models/web-view-type-message.model';
import { ObserveOptions, WebViewMessageBus } from './webview-message-bus';

export enum SourceListen {
  language = 'kiosk-language',
  login = 'kiosk-login',
  order = 'kiosk-order-details',
  ticketing = 'kiosk-ticketing',
}

export enum MessageType {
  AdyenLocalDevicePublicKeyResult = 'payment-device-public-key-result',
  AdyenLocalIdentifyTerminalResult = 'payment-identify-terminal-result',
  AdyenLocalStoreTerminalKeyResult = 'payment-store-terminal-key-result',
  AdyenLocalTerminalKeyStatusResult = 'payment-terminal-key-status-result',
  AppConfig = 'appConfig',
  CheckoutPaymentResult = 'payment-checkout-result',
  CodeScan = 'codeScan',
  FinishPrint = 'finishPrint',
  KioskAuth = 'kioskAuth',
  KioskPrintingFinished = 'printingFinished',
  NFCCardRead = 'nfcCardRead',
  Printer = 'printer',
  RefundPaymentResult = 'payment-refund-result',
  ServicesRouting = 'servicesRouting',
  TapToPayInstallationResult = 'payment-tap-to-pay-installation-result',
  TapToPaySession = 'payment-tap-to-pay-session',
}

@Injectable({
  providedIn: 'root',
})
export class WebviewMessengerService {
  readonly #datadogLogService: DatadogLogService = inject(DatadogLogService);
  #isInitialized = false;
  #messageBus = new WebViewMessageBus();
  #messenger!: WebViewMessenger;
  readonly #ngZone = inject(NgZone);
  #sourceListen!: SourceListen;
  readonly #trackingService: TrackingService = inject(TrackingService);

  discardUnconsumed(type: string): void {
    this.#messageBus.discardUnconsumed(type);
  }

  init(): void {
    if (this.#isInitialized) {
      return;
    }
    this.#isInitialized = true;
    const bridge = new GuestBridge();
    this.#messenger = new WebViewMessenger([bridge]);
    this.#subscribeToAndroidMessage();
  }

  observe<T = unknown>(type: string, options?: ObserveOptions): Observable<T> {
    return this.#messageBus.observe<T>(type, options);
  }

  observeOnce<T>(type: string, options?: ObserveOptions): Observable<T> {
    return this.observe<T>(type, options).pipe(take(1));
  }

  sendWebViewMessage(message: WebViewMessage<unknown>): void {
    this.#messenger.send(message);
  }

  setUpPage(sourceListen: SourceListen): void {
    this.#sourceListen = sourceListen;
  }

  #digestMessage({ data }: AndroidMessage): void {
    this.#datadogLogService.logInfo('[WebViewMessenger] Message received from Android', {
      device: data.device,
      messageType: data.type,
    });
    const actions = {
      [MessageType.AdyenLocalDevicePublicKeyResult]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.AdyenLocalIdentifyTerminalResult]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.AdyenLocalStoreTerminalKeyResult]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.AdyenLocalTerminalKeyStatusResult]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.AppConfig]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.Printer]: () => {
        this.#trackingService.track(
          new KioskPrinterStatusEvent({ device: data.device, status: data.content?.toString() ?? '', source: this.#sourceListen }),
        );
      },
      [MessageType.KioskAuth]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.FinishPrint]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.KioskPrintingFinished]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.CodeScan]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.CheckoutPaymentResult]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.RefundPaymentResult]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.NFCCardRead]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.ServicesRouting]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.TapToPayInstallationResult]: () => {
        this.#emitMessage(data.type, data.content);
      },
      [MessageType.TapToPaySession]: () => {
        this.#emitMessage(data.type, data.content);
      },
    };
    if (actions[data.type as MessageType]) {
      actions[data.type as MessageType]();
    } else {
      this.#datadogLogService.logWarn('[WebViewMessenger] No action defined for message type received from Android', {
        device: data.device,
        messageType: data.type,
      });
    }
  }

  #emitMessage(type: string, data: unknown): void {
    this.#ngZone.run(() => {
      this.#messageBus.publish(type, data);
    });
  }

  #subscribeToAndroidMessage(): void {
    this.#messenger.subscribe<string, AndroidMessage>(
      WebViewTypeMessage.android,
      (payload: string) => new AndroidMessage(payload),
      (message: AndroidMessage) => this.#digestMessage(message),
    );
  }
}
