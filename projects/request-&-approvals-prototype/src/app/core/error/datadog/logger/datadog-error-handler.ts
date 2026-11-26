import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, inject, Injectable } from '@angular/core';

import { JsonObject } from '../../../../shared/models/json-object';
import { ErrorLikeWithContext } from '../../../../shared/services/error-logger/error-like-with-context';
import { ErrorLoggerService } from '../../../../shared/services/error-logger/error-logger.service';
import { FAILED_TO_FETCH_REGEX, isIgnoredErrorMessage } from '../../ignored_errors_regexp';
import { shouldWriteToConsole } from '../../should-write-to-console';
import { DatadogLogService } from './datadog-log.service';

interface NgWrappedError {
  ngOriginalError: Error;
}

interface ErrorWithMessage {
  message: string;
}

@Injectable()
export class DatadogErrorHandler extends ErrorHandler {
  readonly #errorLoggerService = inject(ErrorLoggerService);
  readonly #datadogLogService = inject(DatadogLogService);

  handleError(error: unknown): void {
    const unwrapped = this.#unwrapNgOriginalError(error);
    // Angular's ErrorHandler contract provides an Error-like object with a message property
    const message = (error as Error).message;
    const extractedMessage = this.#extractKnownErrorMessage(unwrapped) ?? message;

    if (this.#isClientConnectivityError(unwrapped, message)) {
      // Only attempt the HTTP log if the browser reports connectivity, otherwise the POST
      // would also fail with status 0 and be retried futilely by RetryInterceptor.
      if (window.navigator.onLine) {
        this.#datadogLogService.logWarn('Client network connectivity issue', {
          errorCategory: 'client_network_connectivity',
          originalMessage: extractedMessage,
          ...(unwrapped instanceof HttpErrorResponse && unwrapped.url !== null ? { url: unwrapped.url } : {}),
        });
      }
      console.warn('Datadog, Client connectivity (warn log only): ', extractedMessage);
    } else if (isIgnoredErrorMessage(extractedMessage)) {
      console.warn('Datadog, Ignoring error: ', extractedMessage);
    } else if (window.navigator.userAgent.toLowerCase().includes('headless')) {
      console.warn('Datadog, Ignoring headless browser errors: ', extractedMessage);
    } else {
      this.#errorLoggerService.trace(this.#extractError(error));
    }
    if (shouldWriteToConsole()) {
      super.handleError(error);
    }
  }

  #extractError(errorCandidate: unknown): Error {
    const unwrapped = this.#unwrapNgOriginalError(errorCandidate);
    // errorCandidate is the raw Angular error object, cast needed to fit JsonObject context
    const context: JsonObject = { originalError: errorCandidate as JsonObject };

    if (unwrapped instanceof HttpErrorResponse) {
      const httpError = this.#extractHttpError(unwrapped);
      if (httpError instanceof Error) {
        return httpError;
      }
      const knownMessage = this.#extractKnownErrorMessage(unwrapped);
      return new ErrorLikeWithContext(typeof httpError === 'string' ? httpError : (knownMessage ?? 'Handled unknown error'), context);
    }

    if (unwrapped instanceof Error) {
      return unwrapped;
    }

    const knownMessage = this.#extractKnownErrorMessage(unwrapped);
    return new ErrorLikeWithContext(typeof unwrapped === 'string' ? unwrapped : (knownMessage ?? 'Handled unknown error'), context);
  }

  #extractHttpError(error: HttpErrorResponse): Error | string {
    if (error.error instanceof Error) {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    return error.message;
  }

  // HttpErrorResponse with status 0 means the browser could not reach the server.
  // The regex fallback covers native Fetch API errors ("Failed to fetch").
  #isClientConnectivityError(unwrapped: unknown, message: string | undefined): boolean {
    if (unwrapped instanceof HttpErrorResponse && unwrapped.status === 0) {
      return true;
    }
    return message !== undefined && FAILED_TO_FETCH_REGEX.test(message);
  }

  #extractKnownErrorMessage(errorCandidate: unknown): string | undefined {
    if (typeof errorCandidate === 'string') {
      return errorCandidate;
    }

    if (errorCandidate instanceof Error) {
      return errorCandidate.message;
    }

    if (this.#hasMessage(errorCandidate)) {
      return errorCandidate.message;
    }

    if (this.#hasErrorObjectWithMessage(errorCandidate)) {
      return errorCandidate.error.message;
    }

    return undefined;
  }

  #hasErrorObjectWithMessage(errorCandidate: unknown): errorCandidate is { error: ErrorWithMessage } {
    if (typeof errorCandidate !== 'object' || errorCandidate === null || !('error' in errorCandidate)) {
      return false;
    }
    const nestedError = (errorCandidate as { error?: unknown }).error;
    return this.#hasMessage(nestedError);
  }

  #hasMessage(errorCandidate: unknown): errorCandidate is ErrorWithMessage {
    if (typeof errorCandidate !== 'object' || errorCandidate === null || !('message' in errorCandidate)) {
      return false;
    }
    return typeof (errorCandidate as { message: unknown }).message === 'string';
  }

  #unwrapNgOriginalError(error: unknown): unknown {
    // Angular wraps original errors inside ngOriginalError when re-throwing through the framework
    if (error != null && (error as NgWrappedError).ngOriginalError != null) {
      return (error as NgWrappedError).ngOriginalError;
    }
    return error;
  }
}
