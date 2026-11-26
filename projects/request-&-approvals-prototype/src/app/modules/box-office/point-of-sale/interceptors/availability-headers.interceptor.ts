import { HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { TICKETING_AVAILABILITY_REQUEST } from '@fz/ticketing';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { CAPN_ID } from '../../../../shared/services/partner/partner.service';

const AVAILABILITY_TIMEOUT_IN_MS = 12000;

const ACCOR_LANGUAGE_MAP: Record<string, string> = {
  en: 'accor-en-gb',
  es: 'accor-es-es',
  fr: 'accor-fr-fr',
  pt: 'accor-pt-br',
};

const AVAILABILITY_URL_PATTERN = new RegExp(
  `^${escapeForRegExp(environment.apiBaseUrl)}/partners/(\\d+)/plans/\\d+/places/\\d+/(?:availability|sessions|sessions_for_date)/`,
);

/**
 * Keeps availability requests issued outside `SessionAvailabilityService` (the ticketing libraries)
 * on the same wire contract as the legacy service. See `plans/B2BS/B2BS-1449-pos-ticketing-date-selector.md`.
 *
 * Gated on the `TICKETING_AVAILABILITY_REQUEST` context token rather than on the URL alone: other
 * callers share these URL shapes (custom-packs eligible sessions hits the same `…/sessions/` path
 * with no timeout on purpose) and must not inherit the 12s timeout.
 */
@Injectable({
  providedIn: 'root',
})
export class AvailabilityHeadersInterceptor implements HttpInterceptor {
  readonly #translateService = inject(TranslateService);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!request.context.get(TICKETING_AVAILABILITY_REQUEST)) {
      return next.handle(request);
    }

    const partnerId = AVAILABILITY_URL_PATTERN.exec(request.url)?.[1];
    if (partnerId === undefined) {
      return next.handle(request);
    }

    let headers: HttpHeaders = this.#appendMissing(request.headers, 'timeout', `${AVAILABILITY_TIMEOUT_IN_MS}`);
    if (Number(partnerId) === CAPN_ID) {
      headers = this.#appendMissing(headers, 'Accept-Language', this.#getHeaderLanguage());
    }

    return headers === request.headers ? next.handle(request) : next.handle(request.clone({ headers }));
  }

  #appendMissing(headers: HttpHeaders, name: string, value: string): HttpHeaders {
    return headers.has(name) ? headers : headers.append(name, value);
  }

  #getHeaderLanguage(): string {
    const currentLang: string = this.#translateService.currentLang;
    return ACCOR_LANGUAGE_MAP[currentLang] ?? currentLang;
  }
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
