import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { CheckoutLogContext } from './models/checkout-log-context.interface';

@Injectable({ providedIn: 'root' })
export class CheckoutLoggerService {
  readonly #datadogLogService = inject(DatadogLogService);

  error(message: string, context: CheckoutLogContext, payload?: Record<string, unknown>): void {
    this.#datadogLogService.logError(this.#buildMessage(message, context), payload);
  }

  info(message: string, context: CheckoutLogContext, payload?: Record<string, unknown>): void {
    this.#datadogLogService.logInfo(this.#buildMessage(message, context), payload);
  }

  #buildMessage(message: string, context: CheckoutLogContext): string {
    let log = `[Checkout] ${context.stage} - ${message}`;
    if (context.data != null) {
      const data = context.data;
      log +=
        ' - ' +
        Object.keys(data)
          .map((key: string) => {
            return `${key}: ${data[key]}`;
          })
          .join(' ');
    }

    return log;
  }
}
