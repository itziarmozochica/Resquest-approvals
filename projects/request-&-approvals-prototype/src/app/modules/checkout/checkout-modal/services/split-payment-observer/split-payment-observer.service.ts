import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';

import { SplitCancelState } from './models/split-cancel-state.enum';
import type { SplitPaymentCorrelationKeys } from './models/split-payment-correlation-keys.model';
import { SplitPaymentEvent } from './models/split-payment-event.enum';
import type { UnresolvedOpening } from './models/unresolved-opening.model';

type LogLevel = 'info' | 'warn';

export interface CartPaymentOutcomeUnknownDetails {
  errorType: string;
  amount?: number;
  errorStatus?: number;
  gateway?: string;
  method?: string;
}

/** Faceted marker on every split-payment log line (never a message-string prefix); mirrors the fever2 taxonomy. */
export const SPLIT_PAYMENT_FLOW = 'split_payment';

/**
 * Emits the split-payment box-office decisions the backend cannot see, under the exact fever2
 * attribute contract, so `@cart_id:X flow:split_payment` returns FZ + fever2 lines together (B2BO-7616).
 * Thin wrapper over {@link DatadogLogService}, like `CheckoutLoggerService`.
 */
@Injectable({ providedIn: 'root' })
export class SplitPaymentObserverService {
  readonly #datadogLogService = inject(DatadogLogService);

  cartPaymentOutcomeUnknown(keys: SplitPaymentCorrelationKeys, details: CartPaymentOutcomeUnknownDetails): void {
    this.#emit(
      SplitPaymentEvent.CartPaymentOutcomeUnknown,
      keys,
      {
        error_type: details.errorType,
        ...(details.errorStatus !== undefined && { error_status: details.errorStatus }),
        ...this.#legAttributes(details),
      },
      'warn',
    );
  }

  sessionCancelRequested(keys: SplitPaymentCorrelationKeys, state: SplitCancelState): void {
    this.#emit(SplitPaymentEvent.SessionCancelRequested, keys, { state });
  }

  sessionCancelUnresolved(keys: SplitPaymentCorrelationKeys, opening: UnresolvedOpening): void {
    this.#emit(SplitPaymentEvent.SessionCancelUnresolved, keys, { source: opening.source, ...this.#legAttributes(opening) }, 'warn');
  }

  #buildCorrelationKeys(keys: SplitPaymentCorrelationKeys): Record<string, string | number> {
    return {
      cart_id: keys.cartId,
      ...(keys.splitSessionId != null ? { split_session_id: keys.splitSessionId } : {}),
      ...(keys.partnerId != null ? { partner_id: keys.partnerId } : {}),
      ...(keys.currency != null ? { currency: keys.currency } : {}),
      ...(keys.deviceId != null ? { device_id: keys.deviceId } : {}),
      ...(keys.channel != null ? { channel: keys.channel } : {}),
    };
  }

  #emit(event: SplitPaymentEvent, keys: SplitPaymentCorrelationKeys, attributes: Record<string, unknown>, level: LogLevel = 'info'): void {
    const payload = {
      event,
      flow: SPLIT_PAYMENT_FLOW,
      ...this.#buildCorrelationKeys(keys),
      ...attributes,
    };
    if (level === 'warn') {
      this.#datadogLogService.logWarn(`Split payment ${event}`, payload);
      return;
    }
    this.#datadogLogService.logInfo(`Split payment ${event}`, payload);
  }

  #legAttributes({ amount, gateway, method }: { amount?: number; gateway?: string; method?: string }): Record<string, string | number> {
    return {
      ...(amount !== undefined && { amount }),
      ...(gateway !== undefined && { gateway }),
      ...(method !== undefined && { method }),
    };
  }
}
