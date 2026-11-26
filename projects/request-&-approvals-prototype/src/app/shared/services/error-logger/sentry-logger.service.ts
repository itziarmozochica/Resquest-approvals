import { Injectable } from '@angular/core';

import * as Sentry from '@sentry/angular';

@Injectable({ providedIn: 'root' })
export class SentryLoggerService {
  /**
   * Logs a warning message to both console and Sentry
   * @param message The warning message to log
   */
  logWarning(message: string): void {
    console.warn(message);
    Sentry.captureMessage(message, 'warning');
  }
}
