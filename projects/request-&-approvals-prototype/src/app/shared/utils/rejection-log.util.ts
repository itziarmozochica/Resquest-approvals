import { isErrorLike } from './is-error.utils';

export function serializeRejectionForLog(value: unknown): string {
  try {
    if (isErrorLike(value)) {
      return value.stack ?? `${value.name}: ${value.message}`;
    }
    if (value !== undefined && value !== null && typeof value === 'object' && !(value instanceof Event)) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  } catch {
    // `String(value)` is what threw, so the fallback cannot reuse it: `FzErrorHandler.handleError` calls
    // this before the Datadog handler, and a throw here loses the error from both backends.
    return Object.prototype.toString.call(value);
  }
}

export function serializeCustomEventForLog(event: CustomEvent): string {
  try {
    const eventData: Record<string, unknown> = {
      type: event.type,
      detailType: event.detail === null ? 'null' : typeof event.detail,
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      composed: event.composed,
      isTrusted: event.isTrusted,
      timeStamp: event.timeStamp,
    };

    const eventAny = event as unknown as Record<string, unknown>;
    if (eventAny.reason !== undefined) {
      try {
        eventData.reason = serializeRejectionForLog(eventAny.reason);
      } catch {
        eventData.reason = String(eventAny.reason);
      }
    }
    if (eventAny.promise !== undefined) {
      eventData.hasPromise = true;
    }

    if (event.detail !== undefined) {
      eventData.detail = event.detail;
    } else {
      eventData.detail = null;
    }

    if (event.detail !== null && event.detail !== undefined) {
      try {
        eventData.detailSerialized = JSON.stringify(event.detail, null, 2);
      } catch {
        eventData.detail = String(event.detail);
        eventData.detailString = eventData.detail;
      }
    }

    return JSON.stringify(eventData, null, 2);
  } catch {
    return `CustomEvent: ${event.type} (detail: ${event.detail === null ? 'null' : typeof event.detail})`;
  }
}
