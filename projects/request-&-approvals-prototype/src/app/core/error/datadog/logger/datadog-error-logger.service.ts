import { Injectable } from '@angular/core';

import { datadogRum } from '@datadog/browser-rum-slim';

import { ErrorLoggerService } from '../../../../shared/services/error-logger/error-logger.service';
import { ErrorWithContext } from '../../../../shared/services/error-logger/error-with-context';

@Injectable()
export class DatadogErrorLoggerService extends ErrorLoggerService {
  print(error: unknown): void {
    console.error(error);
  }

  trace(error: Error): void {
    this.print(error);
    const context = error instanceof ErrorWithContext && error?.context ? error.context : undefined;
    datadogRum.addError(error, context);
  }
}
