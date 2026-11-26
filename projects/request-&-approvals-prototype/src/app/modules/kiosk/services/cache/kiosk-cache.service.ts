import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { defer, EMPTY, Observable, of } from 'rxjs';
import { catchError, finalize, ignoreElements, shareReplay, tap } from 'rxjs/operators';

export interface RequestCacheParams {
  url: string;
  queryParams?: HttpParams | Record<string, string | string[]>;
  language?: string;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class KioskCacheService {
  #requestsCache: Map<string, CacheEntry<unknown>> = new Map();
  #inFlightRequests: Map<string, Observable<unknown>> = new Map();

  clear(): void {
    this.#requestsCache.clear();
    this.#inFlightRequests.clear();
  }

  cacheRequest<T>(params: RequestCacheParams, response: T, timeoutInSeconds: number = 600): void {
    const cacheKey = this.#generateRequestCacheKey(params);
    const expiresAt = Date.now() + timeoutInSeconds * 1000;

    this.#requestsCache.set(cacheKey, {
      data: response,
      expiresAt,
    });
  }

  fetchAndCache<T>(params: RequestCacheParams, fetchFn: () => Observable<T>, timeoutInSeconds: number = 600): Observable<T> {
    return fetchFn().pipe(tap(data => this.cacheRequest(params, data, timeoutInSeconds)));
  }

  getWithRevalidate<T>(
    params: RequestCacheParams,
    fetchFn: () => Observable<T>,
    timeoutInSeconds: number = 600,
    staleForSeconds: number = 0,
  ): Observable<T> {
    const cachedEntry = this.#getRequestCached<T>(params, staleForSeconds);
    if (cachedEntry) {
      this.#sharedFetch(params, fetchFn, timeoutInSeconds)
        .pipe(catchError(() => EMPTY))
        .subscribe();
      return of(cachedEntry);
    }

    return defer(() => this.#sharedFetch(params, fetchFn, timeoutInSeconds));
  }

  warm<T>(
    params: RequestCacheParams,
    fetchFn: () => Observable<T>,
    timeoutInSeconds: number = 600,
    staleForSeconds: number = 0,
  ): Observable<never> {
    if (this.#getRequestCached<T>(params, staleForSeconds) !== null) {
      return EMPTY;
    }
    return this.#sharedFetch(params, fetchFn, timeoutInSeconds).pipe(
      catchError(() => EMPTY),
      ignoreElements(),
    );
  }

  #sharedFetch<T>(params: RequestCacheParams, fetchFn: () => Observable<T>, timeoutInSeconds: number): Observable<T> {
    const cacheKey = this.#generateRequestCacheKey(params);
    const inFlight = this.#inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight as Observable<T>;
    }
    const request$ = fetchFn().pipe(
      tap(data => this.cacheRequest(params, data, timeoutInSeconds)),
      finalize(() => this.#inFlightRequests.delete(cacheKey)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.#inFlightRequests.set(cacheKey, request$);
    return request$;
  }

  #getRequestCached<T>(params: RequestCacheParams, staleForSeconds: number): T | null {
    const cacheKey = this.#generateRequestCacheKey(params);
    const cachedEntry = this.#requestsCache.get(cacheKey);

    if (!cachedEntry || Date.now() > cachedEntry.expiresAt + staleForSeconds * 1000) {
      return null;
    }

    return cachedEntry.data as T;
  }

  #generateRequestCacheKey(params: RequestCacheParams): string {
    const { url, queryParams, language } = params;
    let queryParamsString = '';

    if (queryParams) {
      if (queryParams instanceof HttpParams) {
        queryParamsString = queryParams.toString();
      } else {
        queryParamsString = Object.entries(queryParams)
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return value
                .sort()
                .map(v => `${key}=${v}`)
                .join('&');
            }
            return `${key}=${value}`;
          })
          .join('&');
      }
    }

    return [url, queryParamsString, language || ''].filter(Boolean).join('|');
  }
}
