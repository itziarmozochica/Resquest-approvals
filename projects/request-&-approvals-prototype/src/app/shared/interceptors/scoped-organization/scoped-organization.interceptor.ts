import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PartnerService } from '../../services/partner/partner.service';
import { SCOPED_ORGANIZATION_HEADER } from '../custom-headers';

/** Base URLs whose CORS policy grants `X-Scoped-Organization-Id`. Extend only once a service grants it. */
const SCOPED_ORGANIZATION_ALLOWLIST: readonly string[] = [environment.apiGWBaseUrl, environment.apiIamBaseUrl];

/**
 * Cross-organization IAM reads that must never inherit an acting organization.
 * Exact path only — `/1.0/users/me` and `/1.0/users/:id/…` stay allowlisted.
 */
const SCOPED_ORGANIZATION_EXCLUDED_PATHS: readonly string[] = [`${environment.apiIamBaseUrl}/1.0/users`];

/**
 * Cross-organization IAM reads addressed by a numeric id: `/2.0/users/:userId` only, nothing nested under it.
 */
const SCOPED_ORGANIZATION_EXCLUDED_ID_PATHS: readonly string[] = [`${environment.apiIamBaseUrl}/2.0/users/`];

const NUMERIC_ID = /^\d+$/u;

/** Path-boundary match: `apiGWBaseUrl` is `${apiBaseUrl}-partners`, so a bare prefix would over-match. */
function isAllowlisted(url: string): boolean {
  return SCOPED_ORGANIZATION_ALLOWLIST.some(baseUrl => url === baseUrl || url.startsWith(`${baseUrl}/`));
}

function isExcluded(url: string): boolean {
  return (
    SCOPED_ORGANIZATION_EXCLUDED_PATHS.some(path => url === path) ||
    SCOPED_ORGANIZATION_EXCLUDED_ID_PATHS.some(prefix => url.startsWith(prefix) && NUMERIC_ID.test(url.slice(prefix.length)))
  );
}

/**
 * Stamps the acting organization on requests to the services that accept it.
 *
 * Read live from `PartnerService` per request, since organizations switch in-tab without a reload. A
 * request that already names the header keeps its own value.
 */
export const scopedOrganizationInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (!isAllowlisted(req.url) || isExcluded(req.url) || req.headers.has(SCOPED_ORGANIZATION_HEADER)) {
    return next(req);
  }

  const organizationId = inject(PartnerService).getActingOrganizationId();

  if (organizationId === null) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { [SCOPED_ORGANIZATION_HEADER]: String(organizationId) } }));
};
