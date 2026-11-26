import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const timeoutValueNumeric: number | typeof NaN = parseInt(req.headers.get('timeout') ?? '');
    if (isNaN(timeoutValueNumeric)) {
      return next.handle(req);
    }
    const reqWithoutTimeoutHeader = req.clone({ headers: req.headers.delete('timeout') });
    return next.handle(reqWithoutTimeoutHeader).pipe(timeout(timeoutValueNumeric));
  }
}
