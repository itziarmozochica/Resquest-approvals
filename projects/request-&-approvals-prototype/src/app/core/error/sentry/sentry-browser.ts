import type { Breadcrumb, ErrorEvent, EventHint } from '@sentry/angular';
import * as Sentry from '@sentry/angular';

import packageJson from '../../../../../package.json';
import { environment } from '../../../../environments/environment';
import { isErrorLike } from '../../../shared/utils/is-error.utils';
import { isEmptyUnhandledRejectionCustomEvent, isIgnoredErrorMessage, isIgnoredInjectedScriptError } from '../ignored_errors_regexp';
import { redactSensitiveQueryParams } from '../redact-sensitive-query-params.util';

/**
 * URLs whose stack frames should be dropped before reaching Sentry.
 *
 * Hotjar is loaded as a first-party `<script>` from `partners.feverup.com`
 * (see `src/assets/js/third-party-init.js`) but its runtime bundle is served from
 * `script.hotjar.com` and routinely throws `NS_ERROR_FAILURE` on Firefox
 * when Enhanced Tracking Protection or privacy extensions partition / block
 * its `localStorage` access (see Sentry issue FEVERZONE-1B4). We can't patch
 * vendor code, so we filter any event whose stack originates in a Hotjar host.
 *
 * PayPal Honey can also reject promises from its Safari extension bundle while
 * users browse Feverzone (see FEVERZONE-19S). These events have no actionable
 * first-party stack frames, so they are filtered at the source URL level too.
 */
const SENTRY_DENY_URLS: RegExp[] = [
  /script\.hotjar\.com/,
  /static\.hotjar\.com/,
  /vars\.hotjar\.com/,
  /vc\.hotjar\.io/,
  /Honey\.safariextension/,
];

/**
 * Console breadcrumbs matching these are dropped before they reach Sentry's buffer.
 *
 * Sentry keeps the last 100 breadcrumbs. The Optimizely SDK logs two lines per flag evaluation, and
 * the layout and sidebar evaluate ~50 flags on init, so a single render can fill the entire buffer
 * in ~30ms and evict the navigation, XHR and click breadcrumbs that make an error diagnosable — the
 * FEVERZONE-21B events from 2026-08-10 arrived with 100 Optimizely lines and nothing else.
 *
 * Warning and error console breadcrumbs are always kept: the noise is the per-flag INFO flood, while
 * warnings and errors (e.g. a feature key missing from the datafile) are exactly the diagnostic
 * lines the filter exists to protect.
 *
 * `OptimizelyService` also raises the SDK's log level in production, which is the real fix; this is
 * a safety net so the buffer keeps its diagnostic value if that regresses or another dependency
 * starts logging per-operation.
 */
const NOISY_CONSOLE_BREADCRUMBS: RegExp[] = [/^\[OPTIMIZELY\]/];

function isNoisyConsoleBreadcrumb(breadcrumb: Breadcrumb): boolean {
  if (breadcrumb.category !== 'console') {
    return false;
  }
  if (breadcrumb.level === 'warning' || breadcrumb.level === 'error') {
    return false;
  }
  const message = breadcrumb.message ?? '';
  return NOISY_CONSOLE_BREADCRUMBS.some(pattern => pattern.test(message));
}

const URL_BEARING_BREADCRUMB_KEYS = ['url', 'from', 'to'] as const;

export class SentryBrowser {
  static addPartnerContext(partnerId: number) {
    Sentry.setExtra('partnerId', partnerId);
  }

  static addUserContext(userId: number) {
    Sentry.setExtra('userId', userId);
  }

  static init(): void {
    const releaseName = environment.sentry.commitHash;
    const sentryConfig: Sentry.BrowserOptions = {
      denyUrls: SENTRY_DENY_URLS,
      dsn: environment.sentry.dsn,
      enabled: environment.sentry.enabled,
      environment: environment.sentry.environment,
      integrations: [],
      release: releaseName,
      sampleRate: environment.sentry.errorSampleRate,
      beforeBreadcrumb: (breadcrumb: Breadcrumb): Breadcrumb | null => (isNoisyConsoleBreadcrumb(breadcrumb) ? null : breadcrumb),
      beforeSend: (event: ErrorEvent, hint: EventHint): ErrorEvent | null => {
        const userAgent = window.navigator.userAgent;
        const originalException = hint?.originalException;
        const message = (originalException as { message: string })?.message;
        const httpStatus = (originalException as { status: number })?.status;
        const stack = isErrorLike(originalException) ? originalException.stack : undefined;
        if (isEmptyUnhandledRejectionCustomEvent(originalException)) {
          return null;
        } else if (httpStatus === 0) {
          console.warn('Sentry, Ignoring connectivity error: ', message);
          return null;
        } else if (isIgnoredErrorMessage(message) || isIgnoredInjectedScriptError(message, stack)) {
          console.warn('Sentry, Ignoring error: ', message);
          return null;
        } else if (userAgent.toLowerCase().includes('headless')) {
          console.warn('Sentry, Ignoring headless browser errors', message);
          return null;
        }
        return SentryBrowser.#redactSensitiveUrls(event);
      },
    };

    Sentry.setTag('version', packageJson.version);
    Sentry.init(sentryConfig);
  }

  static #redactSensitiveUrls(event: ErrorEvent): ErrorEvent {
    if (event.request?.url !== undefined) {
      event.request.url = redactSensitiveQueryParams(event.request.url);
    }

    const referer = event.request?.headers?.['Referer'];
    if (event.request?.headers !== undefined && referer !== undefined) {
      event.request.headers['Referer'] = redactSensitiveQueryParams(referer);
    }

    event.breadcrumbs?.forEach(breadcrumb => {
      const data = breadcrumb.data;
      if (data === undefined) {
        return;
      }
      // `url` covers fetch/xhr breadcrumbs; `from`/`to` cover history navigation ones.
      URL_BEARING_BREADCRUMB_KEYS.forEach(key => {
        const value: unknown = data[key];
        if (typeof value === 'string') {
          data[key] = redactSensitiveQueryParams(value);
        }
      });
    });

    return event;
  }
}
