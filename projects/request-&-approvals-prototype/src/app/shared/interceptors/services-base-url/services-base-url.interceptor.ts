import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';

import { Observable } from 'rxjs';

import { ServicesRoutingService } from '../../services/services-routing/services-routing.service';

const SERVICES_FEVERUP_URL_PATTERN = /^(https?:\/\/services(?:\.[^./]+)?\.feverup\.com)(?=[/?#]|$)/;

// Every environment serves the services' API prefixes on its own partners origin (see runtime/*.json), so
// those paths must reach the local proxy too. `/b2b/marketing` and `/b2b/invitation` are S3 objects, and
// every other path on this host is the SPA.
const PARTNERS_FEVERUP_API_URL_PATTERN =
  /^https?:\/\/partners(?:\.[^./]+)?\.feverup\.com(?=\/(?!b2b\/(?:marketing|invitation)(?:[/?#]|$))(?:b2b-access-control|ads|agents|api|b2c_site|b2b|b2b-partners|b2b-iam|spots|crm|insights-api|notifications)(?:[/?#]|$))/;

export const servicesBaseUrlInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const servicesRoutingService = inject(ServicesRoutingService);
  const servicesBaseUrl = servicesRoutingService.getSnapshot();

  if (servicesBaseUrl === null) {
    return next(req);
  }

  const match = SERVICES_FEVERUP_URL_PATTERN.exec(req.url) ?? PARTNERS_FEVERUP_API_URL_PATTERN.exec(req.url);
  if (match === null) {
    return next(req);
  }

  const normalisedBaseUrl = servicesBaseUrl.endsWith('/') ? servicesBaseUrl.slice(0, -1) : servicesBaseUrl;
  const rewrittenUrl = normalisedBaseUrl + req.url.slice(match[0].length);
  return next(req.clone({ url: rewrittenUrl }));
};
