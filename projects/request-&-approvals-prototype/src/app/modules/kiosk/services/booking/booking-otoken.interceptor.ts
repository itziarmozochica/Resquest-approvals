import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';

import { BookingOtokenStore } from './booking-otoken.store';

/**
 * Customer-facing order endpoints that accept the order-group `otoken`
 * (mirrors the webclient3 portal's order-group token interceptor surface).
 * The token is attached ONLY to these paths so it never leaks elsewhere.
 */
const ORDER_GROUP_OTOKEN_URL_PATTERNS: RegExp[] = [
  /\/api\/5\.0\/user\/orders\//,
  /\/api\/4\.2\/orders\//,
  /\/api\/4\.3\/orders\//,
  /\/api\/5\.0\/entitlements\/reschedule\//,
];

/**
 * Matches only the customer API host order-group endpoints. The host check guarantees
 * the `otoken` can never be attached to a request to a different host that merely happens
 * to contain one of the matched paths (the patterns are unanchored substrings).
 */
function isOrderGroupOtokenRequest(url: string): boolean {
  return url.startsWith(environment.apiB2CBaseUrl) && ORDER_GROUP_OTOKEN_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Attaches the kiosk booking session's `otoken` as a `Bearer` Authorization
 * header on the order-group customer endpoints. No-op when the request is not a
 * customer API host order-group endpoint, when there is no active token, or when an
 * Authorization header is already present (e.g. the partner `B2bToken` set by
 * `AddHeadersInterceptor`), so it can never clobber existing auth.
 */
export function bookingOtokenInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  if (!isOrderGroupOtokenRequest(req.url) || req.headers.has('Authorization')) {
    return next(req);
  }

  const otoken = inject(BookingOtokenStore).get();
  if (!otoken) {
    return next(req);
  }

  return next(
    req.clone({
      headers: req.headers.set('Authorization', `Bearer ${otoken}`),
    }),
  );
}
