import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable } from '@angular/core';

import { SentryErrorHandler } from '@sentry/angular';

import { ErrorLikeWithContext } from '../../shared/services/error-logger/error-like-with-context';
import { isErrorLike } from '../../shared/utils/is-error.utils';
import { serializeRejectionForLog } from '../../shared/utils/rejection-log.util';
import { DatadogErrorHandler } from './datadog/logger/datadog-error-handler';

interface NormalizedThrowable extends Error {
  code?: number;
  status?: number;
}

/**
 * A key is reported only when it reads as a field name. A payload keyed *by* its data — an order
 * reference, an email — would otherwise publish that data as the exception value and split the group by
 * it, which is what describing the shape instead of the payload exists to prevent.
 */
const DESCRIBABLE_KEY = /^[A-Za-z_$][\w$]{0,39}$/;
const MAX_DESCRIBED_KEYS = 12;
const NETWORK_ERROR_STATUS = 0;

@Injectable({ providedIn: 'root' })
export class FzErrorHandler extends ErrorHandler {
  static readonly handledAuthStatuses: number[] = [401, 403];

  constructor(
    private readonly sentryErrorHandler: SentryErrorHandler,
    private readonly dataDogErrorHandler: DatadogErrorHandler,
  ) {
    super();
  }

  handleError(error: unknown): void {
    const unwrapped = this.#unwrapNgOriginalError(error);
    if (this.#isHandledAuthError(unwrapped)) {
      return;
    }

    if (!this.#isNetworkHttpError(unwrapped)) {
      this.sentryErrorHandler.handleError(this.#normalizeForSentry(error, unwrapped));
    }
    this.dataDogErrorHandler.handleError(error);
  }

  /**
   * A `PromiseRejectionEvent` carries `reason` directly; zone.js delivers a `CustomEvent` whose `detail`
   * wraps `{ reason, promise }`, the shape `app.module.ts` reads, so `detail.reason` is unwrapped too —
   * describing `detail` itself would report the constant `{promise, reason}` for every such rejection.
   *
   * An error-like reason is described by its message, the same value `#normalizeForSentry` keeps at the
   * top level and the only useful one here, since `Object.keys(new Error())` is empty. Nothing recurses:
   * an event whose reason is an event could cycle, and a `RangeError` raised here would escape
   * `handleError` before the Datadog call and lose the error from both backends.
   */
  #describeEventPayload(event: Event): string {
    const detail = 'detail' in event ? event.detail : undefined;
    const nestedReason = this.#isRecord(detail) ? detail.reason : undefined;
    const payload = ('reason' in event ? event.reason : undefined) ?? nestedReason ?? detail;

    if (payload === null || payload === undefined) {
      return '';
    }
    if (isErrorLike(payload) && payload.message !== '') {
      return `, reason: ${payload.message}`;
    }
    if (payload instanceof Event) {
      return `, reason: ${payload.type} event`;
    }
    if (!this.#isRecord(payload)) {
      return `, reason: ${typeof payload}`;
    }

    return `, reason: ${this.#describeKeys(payload)}`;
  }

  #describeKeys(value: Record<string, unknown>): string {
    const keys = Object.keys(value).sort();
    const described = keys.filter(key => DESCRIBABLE_KEY.test(key)).slice(0, MAX_DESCRIBED_KEYS);
    const omitted = keys.length - described.length;

    return `{${[...described, ...(omitted > 0 ? [`+${omitted}`] : [])].join(', ')}}`;
  }

  /**
   * The shape of a throwable, never its values.
   *
   * This becomes the Sentry exception value, which nothing redacts (`redactSensitiveQueryParams` only
   * rewrites `request.url` and the breadcrumbs), nothing truncates (`maxValueLength` is unset), and Sentry
   * groups on, since `#normalizeForSentry` leaves the stack undefined. Serializing the payload would both
   * publish whatever it held and split FEVERZONE-A3 into one issue per order id.
   */
  #describeThrowable(value: unknown): string {
    if (value instanceof Event) {
      // `type`, not `constructor.name`: the production build mangles the latter for app-defined subclasses.
      return `${value.type} event${this.#describeEventPayload(value)}`;
    }

    if (!this.#isRecord(value)) {
      return serializeRejectionForLog(value);
    }

    return this.#describeKeys(value);
  }

  #extractStatus(error: unknown): number | undefined {
    if (!this.#isStatusCarrier(error)) {
      return undefined;
    }

    if (typeof error.status === 'number') {
      return error.status;
    }

    if (typeof error.code === 'number') {
      return error.code;
    }

    return undefined;
  }

  #isHandledAuthError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse) {
      return FzErrorHandler.handledAuthStatuses.includes(error.status);
    }

    const status = this.#extractStatus(error);
    if (status !== undefined) {
      return FzErrorHandler.handledAuthStatuses.includes(status);
    }

    if (!this.#isStatusCarrier(error) || !('error' in error)) {
      return false;
    }

    return this.#isHandledAuthError(error.error);
  }

  #isNetworkHttpError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === NETWORK_ERROR_STATUS;
  }

  #isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  #isSentryExtractable(value: unknown): boolean {
    if (value instanceof Error || value instanceof HttpErrorResponse) {
      return true;
    }

    if (!this.#isRecord(value)) {
      return false;
    }

    return (
      typeof value.name === 'string' && typeof value.message === 'string' && (value.stack === undefined || typeof value.stack === 'string')
    );
  }

  #isStatusCarrier(value: unknown): value is { code?: unknown; error?: unknown; ngOriginalError?: unknown; status?: unknown } {
    return this.#isRecord(value);
  }

  #normalizeForSentry(error: unknown, unwrapped: unknown): unknown {
    if (typeof unwrapped === 'string' || this.#isSentryExtractable(unwrapped)) {
      return error;
    }

    const message =
      isErrorLike(unwrapped) && unwrapped.message !== ''
        ? unwrapped.message
        : `Unextractable throwable: ${this.#describeThrowable(unwrapped)}`;
    const normalized: NormalizedThrowable = new ErrorLikeWithContext(message);

    if (this.#isStatusCarrier(unwrapped)) {
      if (typeof unwrapped.status === 'number') {
        normalized.status = unwrapped.status;
      }
      if (typeof unwrapped.code === 'number') {
        normalized.code = unwrapped.code;
      }
    }

    return normalized;
  }

  #unwrapNgOriginalError(error: unknown): unknown {
    if (this.#isStatusCarrier(error) && 'ngOriginalError' in error && error.ngOriginalError != null) {
      return error.ngOriginalError;
    }
    return error;
  }
}
