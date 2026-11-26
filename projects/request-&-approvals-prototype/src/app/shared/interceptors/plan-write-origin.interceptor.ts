import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { isExternalRequestUrl } from './is-external-request.util';
import { PLAN_WRITE_ORIGIN, PLAN_WRITE_ORIGIN_HEADER } from './plan-write-origin';

@Injectable({
  providedIn: 'root',
})
export class PlanWriteOriginInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const origin = request.context.get(PLAN_WRITE_ORIGIN);

    if (!origin || isExternalRequestUrl(request.url)) {
      return next.handle(request);
    }

    return next.handle(request.clone({ headers: request.headers.set(PLAN_WRITE_ORIGIN_HEADER, origin) }));
  }
}
