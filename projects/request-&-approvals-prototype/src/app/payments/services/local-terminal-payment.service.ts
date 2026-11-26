import { inject, Injectable } from '@angular/core';

import { MessageType, WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { defer, EMPTY, merge, Observable, of, timer } from 'rxjs';
import { filter, finalize, ignoreElements, map, switchMap, take, tap, timeout } from 'rxjs/operators';

import type { LocalTerminalCheckoutResultDto } from '../models/local-terminal-payment.dto';
import type { LocalTerminalPaymentRequest, LocalTerminalPaymentResult } from '../models/local-terminal-payment.model';
import {
  ConfigureLocalTerminalMessage,
  LocalTerminalCancelMessage,
  LocalTerminalCheckoutMessage,
  localTerminalEnvironment,
} from '../models/local-terminal-payment.model';
import { ConfigureTapToPayMessage, isTapToPayTarget, TAP_TO_PAY_DEVICE_TYPE, TAP_TO_PAY_PAYMENT_GATEWAY } from '../models/tap-to-pay.model';
import { fromLocalTerminalCheckoutResultDto } from './local-terminal-payment.adapter';

interface UnsentCheckout {
  cancelled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LocalTerminalPaymentService {
  /** Just past the app's own 150 s window, the limit Adyen sets for a synchronous answer. */
  static readonly paymentTimeoutMs = 155_000;
  /** A NEXO Abort sent before the terminal has the payment aborts nothing and leaves the card live. */
  static readonly cancelArmingDelayMs = 3_000;
  /** The bridge can deliver the checkout before the configure (B2BO-8884); remove once it keeps order. */
  static readonly configureSettleDelayMs = 150;

  readonly #webviewMessengerService = inject(WebviewMessengerService);
  readonly #tapToPayDeviceType = inject(TAP_TO_PAY_DEVICE_TYPE);

  #paymentSentAt: number | null = null;
  #attempt = 0;
  #unsentTapToPayCheckout: UnsentCheckout | null = null;

  cancel(): Observable<void> {
    const unsentCheckout = this.#unsentTapToPayCheckout;
    if (unsentCheckout !== null) {
      unsentCheckout.cancelled = true;
      return of(void 0);
    }
    const sentAt = this.#paymentSentAt;
    if (sentAt === null) {
      return EMPTY;
    }
    const attempt = this.#attempt;
    return timer(Math.max(0, LocalTerminalPaymentService.cancelArmingDelayMs - (Date.now() - sentAt))).pipe(
      // Not `#paymentSentAt`: cancelling unsubscribes `pay`, whose `finalize` clears it before this fires.
      filter(() => this.#attempt === attempt),
      tap(() => this.#webviewMessengerService.sendWebViewMessage(new LocalTerminalCancelMessage())),
      map((): undefined => void 0),
    );
  }

  pay({ amount, currency, terminal }: LocalTerminalPaymentRequest): Observable<LocalTerminalPaymentResult> {
    return defer(() => {
      const result$ = this.#webviewMessengerService
        .observeOnce<LocalTerminalCheckoutResultDto>(MessageType.CheckoutPaymentResult)
        .pipe(timeout(LocalTerminalPaymentService.paymentTimeoutMs), map(fromLocalTerminalCheckoutResultDto));
      const isTapToPay = isTapToPayTarget(terminal);
      const configureMessage = isTapToPay
        ? new ConfigureTapToPayMessage(terminal.saleId, this.#tapToPayDeviceType())
        : new ConfigureLocalTerminalMessage(terminal, localTerminalEnvironment());
      const checkoutMessage = new LocalTerminalCheckoutMessage(amount, currency, isTapToPay ? TAP_TO_PAY_PAYMENT_GATEWAY : undefined);
      const unsentCheckout: UnsentCheckout | null = isTapToPay ? { cancelled: false } : null;
      this.#unsentTapToPayCheckout = unsentCheckout;
      this.#webviewMessengerService.sendWebViewMessage(configureMessage);
      const checkout$ = timer(LocalTerminalPaymentService.configureSettleDelayMs).pipe(
        switchMap((): Observable<never> => {
          this.#unsentTapToPayCheckout = null;
          this.#webviewMessengerService.sendWebViewMessage(checkoutMessage);
          this.#attempt += 1;
          this.#paymentSentAt = Date.now();
          return unsentCheckout?.cancelled === true ? this.cancel().pipe(ignoreElements()) : EMPTY;
        }),
      );
      return merge(result$, checkout$).pipe(
        take(1),
        finalize(() => {
          this.#paymentSentAt = null;
          if (this.#unsentTapToPayCheckout === unsentCheckout) {
            this.#unsentTapToPayCheckout = null;
          }
        }),
      );
    });
  }
}
