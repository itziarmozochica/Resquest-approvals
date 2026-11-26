import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpStatusCode } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, timer } from 'rxjs';
import { map, mergeMap, retryWhen } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { SKIP_RETRY_INTERCEPTOR } from './skip-retry.token';

@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  private retryTimeMs = 1500;

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (request.context.get(SKIP_RETRY_INTERCEPTOR)) {
      return next.handle(request);
    }

    if (this.isCancelOrderUrl(request.url)) {
      return next.handle(request);
    }

    if (request.method === 'POST' && request.url.includes('/reserve/')) {
      return next.handle(request);
    }

    if (this.isEfrUrl(request.url)) {
      return next.handle(request);
    }

    if (this.isFiscalTransactionsUrl(request.url) || this.isFranceDuplicateReceiptUrl(request.url)) {
      return next.handle(request);
    }

    if (request.method === 'POST' && this.isDuplicatePlanUrl(request.url)) {
      return next.handle(request);
    }

    return next.handle(request).pipe(
      retryWhen(errors => {
        return errors.pipe(
          mergeMap((error, index) => {
            if (request.url.search('sso') != -1) {
              throw error;
            }
            if (error.status >= HttpStatusCode.BadRequest && error.status < HttpStatusCode.InternalServerError) {
              throw error;
            }
            if (error.status === HttpStatusCode.NotModified) {
              throw error;
            }
            if (index >= environment.httpMaxRetries) {
              throw error;
            }
            return timer(500).pipe(
              mergeMap(() => timer(this.retryTimeMs)),
              map(() => error),
            );
          }),
        );
      }),
    );
  }

  private isCancelOrderUrl(url: string): boolean {
    return /\/orders\/\d+\/cancel$/.test(url);
  }

  private isDuplicatePlanUrl(url: string): boolean {
    return /\/partners\/\d+\/plans\/\d+\/duplicate$/.test(url);
  }

  private isEfrUrl(url: string): boolean {
    return url.startsWith(environment.efstaEfrBaseUrl);
  }

  private isFiscalTransactionsUrl(url: string): boolean {
    return /\/partners\/\d+\/fiscal\/transactions(?:\/\d+)?$/.test(url);
  }

  private isFranceDuplicateReceiptUrl(url: string): boolean {
    return /\/partners\/\d+\/fiscal\/duplicate-receipt$/.test(url);
  }
}
