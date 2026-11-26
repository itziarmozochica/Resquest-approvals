/** Native Fetch API error when the browser cannot reach the server. */
export const FAILED_TO_FETCH_REGEX = /^Failed to fetch$/;

/**
 * Datadog RUM telemetry transport failing to reach its own intake endpoint, e.g.
 * "Failed to fetch (browser-intake-datadoghq.com)". Produced when an ad blocker,
 * browser extension or restrictive network blocks Datadog's intake. It is benign noise
 * (only telemetry delivery is affected), so it is filtered. Kept narrow (host-specific) on
 * purpose so other "Failed to fetch (...)" errors stay visible.
 */
export const DATADOG_INTAKE_FETCH_REGEX = /^Failed to fetch \(.*datadoghq\.com.*\)$/;

/**
 * Google Analytics (gtag.js) failing to deliver a hit to its own collection endpoint, e.g.
 * "Failed to fetch (www.google-analytics.com)" (FEVERZONE-1BH). Raised by the gtag.js bundle
 * loaded by `src/assets/js/third-party-init.js` when an ad blocker, a browser extension wrapping
 * `window.fetch`, or a restrictive network blocks the request. Only analytics delivery is
 * affected, so it is filtered. Kept narrow (host-specific) so other fetch failures stay visible.
 *
 * The parenthesised host is not part of the native message: `@sentry/core`'s fetch
 * instrumentation appends it (`error.message = `${error.message} (${url.host})``) before
 * rethrowing, which is why the ignore policy can match on it. That same code enhances the
 * Chromium, WebKit and Gecko wordings, so all three are covered here.
 */
export const GOOGLE_ANALYTICS_FETCH_REGEX =
  /^(Failed to fetch|Load failed|NetworkError when attempting to fetch resource\.) \(.*(google-analytics\.com|googletagmanager\.com|analytics\.google\.com).*\)$/;

export const IGNORED_ERROR_REGEX: RegExp[] = [
  /(UnknownError:\s*)?(setPhotoOptions|setOptions) failed/,
  // iOS Safari camera teardown during QR scan (FEVERZONE-13X / B2BO-5408).
  // DOMException.message is bare "Track has ended"; legacy wrapped formats included for compatibility.
  /^(InvalidAccessError:\s*)?Track has ended(\s*applyConstraints.*)?$/,
  /OperationError: The associated Track is in an invalid state/,
  /^InvalidStateError: The object is in an invalid state.$/,
  /^Cannot read properties of null \(reading 'unselectable'\)$/,
  // Third-party / browser extension scripts posting to a closed window, iframe or worker.
  /^Cannot read properties of null \(reading 'postMessage'\)$/,
  // iOS WebKit bridge rejection for browser-level postMessage calls (FEVERZONE-15E).
  /^WKWebView API client did not respond to this postMessage$/,
  // Instagram (and similar) in-app browsers inject sendDataToNative / sendPageHideMessage
  // scripts that assume a WKWebView bridge. On pagehide they evaluate
  // window.webkit.messageHandlers without a guard; outside a real native WebView
  // `webkit` exists but `messageHandlers` does not, so WebKit throws
  // (FEVERZONE-20T / B2BP-851). No first-party frame — stack is the document root.
  /^undefined is not an object \(evaluating 'window\.webkit\.messageHandlers'\)$/,
  // Instagram Android in-app browsers inject navigation_performance_logger_android, which
  // calls sendINPMessage → sendDataToNative over the WebView JavascriptInterface. After
  // the Java object is torn down (IAB teardown / pagehide) the bridge rejects
  // (FEVERZONE-21Q / B2BP-1373). No first-party frame — stack is iabjs://.
  /^Error invoking postMessage: Java object is gone$/,
  // Firefox-iOS-derived browsers (Firefox, Brave on iOS) inject WKUserScripts that reference
  // a `__firefox__` global (reader mode, autofill, ...). An injection-order race leaves it
  // undefined and WebKit throws at the document root (FEVERZONE-21C).
  /__firefox__/,
  // WebExtension messaging bridge rejecting a send whose target tab is already gone
  // (FEVERZONE-T9 / B2BP-306). `runtime`/`tabs` messaging is an extension-only API, injected by
  // the content scripts of privacy browsers and web extensions (DuckDuckGo on iOS, Safari web
  // extensions) and unreachable from page code: our own native bridge is `@feverup/ts-webview`
  // over postMessage. The rejection carries no stack frame at all, so `denyUrls` cannot filter
  // it and the message is the only signal available.
  /^Invalid call to (runtime|tabs)\.(sendMessage|connect)\(\)/,
  // Stripe.js internal passive-captcha controller messaging an iframe that is already gone
  // (FEVERZONE-210 / B2BP-921). Thrown inside js.stripe.com/v3 from Stripe's own captcha
  // token-preload retry timer, so zone.js surfaces it on whatever route the user happens to be
  // on by then, unrelated to any payment in flight. A genuine confirmCardPayment failure still
  // reaches Sentry: StripeService.mapStripeError replaces the message with a translated
  // errors.stripe.* key, which this pattern does not match.
  /^frame window is not ready$/,
  // Stripe unmounted-Element confirm race (FEVERZONE-17X / B2BR-4561)
  /^We could not retrieve data from the specified Element\. Please make sure the Element you are attempting to use is mounted and the ready event has been emitted\.$/,
  // ng-bootstrap modal double-dismiss race: a backdrop click fires after the modal was
  // already closed (e.g. by navigation), so _windowCmptRef is null (FEVERZONE-TT / B2BO-7526).
  /^null is not an object \(evaluating 'this\._windowCmptRef\.instance'\)$/,
  /^The event is not a 'wheel' event.$/,
  /^\[CKEDITOR.resourceManager.load\] Resource name "[^"]+" was not found at(.*)/,
  // Chunk loading errors during deployments (handled by auto-reload)
  /Loading chunk .* failed/, // Webpack ChunkLoadError message
  /Failed to fetch dynamically imported module/, // Modern dynamic import errors
  /^Importing a module script failed\.?$/, // Safari dynamic import errors
  // @zxing/ngx-scanner race condition during teardown when scanner controls are not yet set.
  // See https://github.com/zxing-js/ngx-scanner/issues/397 (open since 2021, present up to v21).
  /^No scanning is running at the time\.?$/,
  // iOS Safari camera start interrupted (scanner dialog closed / app backgrounded) while
  // @zxing/ngx-scanner runs getUserMedia/play() in a floating promise (FEVERZONE-21A).
  // Safe while HttpClient stays XHR-based; revisit if the app adopts withFetch(), whose
  // aborted requests reject with this same DOMException message.
  /^(AbortError:\s*)?The operation was aborted\.?$/,
  FAILED_TO_FETCH_REGEX,
  DATADOG_INTAKE_FETCH_REGEX,
  GOOGLE_ANALYTICS_FETCH_REGEX,
];

/**
 * True when an error message matches one of the known-ignorable patterns above.
 *
 * Centralizes the ignore policy so every reporting path (Sentry `beforeSend`, the Datadog
 * error handler, and the global `unhandledrejection` listener) decides identically. The
 * `unhandledrejection` listener in particular must run this against the *original* rejection
 * reason's message, before that reason is re-wrapped into a generic "Unhandled promise
 * rejection" Error — otherwise the anchored regexes (e.g. `^Failed to fetch$`) no longer match.
 */
export function isIgnoredErrorMessage(message: string | undefined): boolean {
  return message !== undefined && IGNORED_ERROR_REGEX.some((regex: RegExp) => regex.test(message));
}

interface IgnoredInjectedScriptError {
  readonly message: RegExp;
  readonly stack: RegExp;
}

const IGNORED_INJECTED_SCRIPT_ERRORS: readonly IgnoredInjectedScriptError[] = [
  { message: /^The object does not support the operation or argument\.$/, stack: /^dispatchToBridge@/m },
];

export function isIgnoredInjectedScriptError(message: string | undefined, stack: string | undefined): boolean {
  if (message === undefined || stack === undefined) {
    return false;
  }

  return IGNORED_INJECTED_SCRIPT_ERRORS.some(
    ({ message: messageRegex, stack: stackRegex }) => messageRegex.test(message) && stackRegex.test(stack),
  );
}

export function isEmptyUnhandledRejectionCustomEvent(value: unknown): boolean {
  if (!(value instanceof CustomEvent)) {
    return false;
  }

  return value.type === 'unhandledrejection' && value.detail === null && !('reason' in value) && !('promise' in value);
}
