import { datadogRum, RumEvent } from '@datadog/browser-rum-slim';

import { environment } from '../../../../environments/environment';
import { redactSensitiveQueryParams } from '../redact-sensitive-query-params.util';
import { ServerErrorReporter } from './datadog-server-error.reporter';
import { DatadogViewUtils } from './view/datadog-view.utils';

/** Only `view` carries `referrer` and `name`; `resource` and `error.resource` have a URL and nothing else. */
interface RumEventResourceUrl {
  url?: string;
}

interface RumEventViewUrls extends RumEventResourceUrl {
  name?: string;
  referrer?: string;
}

const REDACTED_VIEW_KEYS = ['name', 'referrer', 'url'] as const;

export class DatadogBrowser {
  static init(): void {
    if (!environment.datadog.rum.enabled) {
      return;
    }

    const serverErrorReporter = new ServerErrorReporter();

    const version = environment.datadog.commitHash.substring(0, 7);

    datadogRum.init({
      allowedTracingUrls: [new URL(environment.baseUrl).origin],
      applicationId: environment.datadog.applicationId,
      clientToken: environment.datadog.clientToken,
      env: environment.datadog.environment,
      service: 'feverzoneclient',
      sessionReplaySampleRate: environment.datadog.rum.sessionReplaySampleRate,
      sessionSampleRate: environment.datadog.rum.sessionSampleRate,
      site: environment.datadog.site,
      telemetrySampleRate: environment.datadog.rum.telemetrySampleRate,
      traceSampleRate: environment.datadog.rum.traceSampleRate,
      trackLongTasks: environment.datadog.rum.trackLongTasks,
      trackResources: environment.datadog.rum.trackResources,
      trackUserInteractions: environment.datadog.rum.trackUserInteractions,
      trackViewsManually: true,
      useSecureSessionCookie: environment.datadog.rum.useSecureSessionCookie,
      version,
      beforeSend: (event: RumEvent) => {
        DatadogViewUtils.updateViewEvent(event);
        serverErrorReporter.report(event);
        DatadogBrowser.#redactSensitiveUrls(event);
        return true;
      },
    });
  }

  /** Must run after `updateViewEvent`, which rewrites `view.url` from the router state. */
  static #redactSensitiveUrls(event: RumEvent): void {
    // `view.name` falls back to the router URL for any route that declares no `viewName`, which is all of them.
    const view = event.view as RumEventViewUrls | undefined;
    if (view !== undefined) {
      REDACTED_VIEW_KEYS.forEach(key => {
        const value = view[key];
        if (typeof value === 'string') {
          view[key] = redactSensitiveQueryParams(value);
        }
      });
    }

    const resourceHolders: (RumEventResourceUrl | undefined)[] = [
      (event as { resource?: RumEventResourceUrl }).resource,
      (event as { error?: { resource?: RumEventResourceUrl } }).error?.resource,
    ];

    resourceHolders.forEach(holder => {
      if (typeof holder?.url === 'string') {
        holder.url = redactSensitiveQueryParams(holder.url);
      }
    });
  }
}
