import { datadogRum, RumEvent, RumResourceEvent } from '@datadog/browser-rum-slim';

import {
  isFirstPartyRequest,
  isHeadlessBrowser,
  isIndexedResourceEvent,
  isRequestResource,
  isServerError,
  stripUrlParams,
} from './datadog-server-error.utils';

export const SERVER_ERROR_DEDUPE_WINDOW_MS = 10_000;

export class ServerErrorReporter {
  #recentErrors = new Map<string, number>();

  report(event: RumEvent): void {
    if (isHeadlessBrowser()) {
      return;
    }

    if (!isIndexedResourceEvent(event) || !isRequestResource(event) || !isFirstPartyRequest(event) || !isServerError(event)) {
      return;
    }

    if (this.#isDuplicate(event)) {
      return;
    }

    datadogRum.addError(new Error(`Server error ${event.resource.status_code}`), {
      resource: {
        method: event.resource.method,
        status_code: event.resource.status_code,
        url: stripUrlParams(event.resource.url),
      },
    });
  }

  #isDuplicate(event: RumResourceEvent): boolean {
    const key = `${event.resource.method}|${event.resource.url}|${event.resource.status_code}`;
    const now = Date.now();

    this.#pruneExpired(now);

    if (this.#recentErrors.has(key)) {
      return true;
    }

    this.#recentErrors.set(key, now);
    return false;
  }

  #pruneExpired(now: number): void {
    this.#recentErrors.forEach((seenAt, key) => {
      if (now - seenAt >= SERVER_ERROR_DEDUPE_WINDOW_MS) {
        this.#recentErrors.delete(key);
      }
    });
  }
}
