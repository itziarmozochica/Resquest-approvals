import { HttpClient, HttpContext, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { TranslateLoader } from '@ngx-translate/core';
import { catchError, Observable, switchMap, throwError, timer } from 'rxjs';

import { SKIP_RETRY_INTERCEPTOR } from '../../shared/interceptors/skip-retry.token';

export type Translations = Record<string, unknown>;

const TRANSLATIONS_PATH = './assets/i18n/';
const TRANSLATIONS_SUFFIX = '.json';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 300;
const NETWORK_ERROR_STATUS = 0;

/**
 * Loads the ngx-translate dictionaries, retrying past a response body that is not valid JSON.
 *
 * The dictionaries are ~1 MB static assets, so a truncated download or an HTML page served in
 * their place (CDN SPA fallback, captive portal) makes `HttpClient` fail with
 * "Http failure during parsing" while keeping the 2xx status. That rejects the i18n
 * `APP_INITIALIZER` and the app never boots. Retrying the same URL is not enough, because the
 * browser HTTP cache can replay the same broken body, so every retry here bypasses it and the
 * service worker.
 */
@Injectable({ providedIn: 'root' })
export class TranslationsHttpLoader implements TranslateLoader {
  readonly #http = inject(HttpClient);

  getTranslation(lang: string): Observable<Translations> {
    return this.#loadTranslations(lang, 0);
  }

  #isRetryable(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    const isParseFailure = error.status >= HttpStatusCode.Ok && error.status < HttpStatusCode.MultipleChoices;

    return isParseFailure || error.status === NETWORK_ERROR_STATUS || error.status >= HttpStatusCode.InternalServerError;
  }

  #loadTranslations(lang: string, attempt: number): Observable<Translations> {
    return this.#requestTranslations(lang, attempt).pipe(
      catchError((error: unknown) => {
        if (attempt >= MAX_RETRIES || !this.#isRetryable(error)) {
          return throwError(() => error);
        }

        return timer(RETRY_DELAY_MS * (attempt + 1)).pipe(switchMap(() => this.#loadTranslations(lang, attempt + 1)));
      }),
    );
  }

  #requestTranslations(lang: string, attempt: number): Observable<Translations> {
    const url = `${TRANSLATIONS_PATH}${lang}${TRANSLATIONS_SUFFIX}`;
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);

    if (attempt === 0) {
      return this.#http.get<Translations>(url, { context });
    }

    return this.#http.get<Translations>(url, {
      context,
      headers: { 'Cache-Control': 'no-cache' },
      params: { 'ngsw-bypass': 'true', retry: attempt },
    });
  }
}
