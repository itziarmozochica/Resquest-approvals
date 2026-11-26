import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { SKIP_FORBIDDEN_TOAST } from '../../interceptors/skip-forbidden-toast.token';

const ONEBOX_PROVIDER = 'onebox';

export interface ProviderExternalIds {
  externalIds: number[];
  provider: string;
}

interface ProviderExternalIdsResponse {
  external_ids: number[];
  provider: string;
}

interface ExternalIdsResponse {
  providers: ProviderExternalIdsResponse[];
}

@Injectable({
  providedIn: 'root',
})
export class PartnerExternalIdsService {
  /**
   * Kill switch for the PRD-4184 fail-closed gate in {@link hasNoExternalChannels$}: it hid Fz
   * Assistant for partners who have external channels but still want the assistant over their
   * Fever data. Flip to `false` once the eligibility rule accounts for that case.
   */
  static readonly FORCE_SKIP_EXTERNAL_CHANNELS_GATE: boolean = true;
  #cache = new Map<number, Observable<ProviderExternalIds[]>>();
  #http = inject(HttpClient);

  clearCache(partnerId?: number): void {
    if (partnerId !== undefined) {
      this.#cache.delete(partnerId);
    } else {
      this.#cache.clear();
    }
  }

  getExternalIds(partnerId: number): Observable<ProviderExternalIds[]> {
    return this.#externalIds$(partnerId).pipe(catchError(() => of<ProviderExternalIds[]>([])));
  }

  /**
   * Fail-closed gate for features hidden when external channels exist (e.g. Fz Assistant).
   * Emits `true` only when the partner is confirmed to have no external channels. Emits `false`
   * when external channels exist, the partner id is missing, or the request fails — so callers
   * keep the feature hidden unless "no external channels" is proven.
   *
   * Force-skipped via {@link FORCE_SKIP_EXTERNAL_CHANNELS_GATE} — see PRD-4184.
   */
  hasNoExternalChannels$(partnerId: number | undefined): Observable<boolean> {
    if (PartnerExternalIdsService.FORCE_SKIP_EXTERNAL_CHANNELS_GATE) {
      return of(true);
    }
    if (partnerId === undefined) {
      return of(false);
    }
    return this.#externalIds$(partnerId).pipe(
      map(providers => providers.every(provider => provider.externalIds.length === 0)),
      catchError(() => of(false)),
    );
  }

  isOneboxPartner(partnerId: number | undefined): Observable<boolean> {
    if (partnerId === undefined) {
      return of(false);
    }
    return this.getExternalIds(partnerId).pipe(
      map(providers => providers.some(provider => provider.provider === ONEBOX_PROVIDER && provider.externalIds.length > 0)),
    );
  }

  isExternalPartner(partnerId: number | undefined): Observable<boolean> {
    if (partnerId === undefined) {
      return of(false);
    }
    return this.getExternalIds(partnerId).pipe(map(providers => providers.some(provider => provider.externalIds.length > 0)));
  }

  #externalIds$(partnerId: number): Observable<ProviderExternalIds[]> {
    const cached = this.#cache.get(partnerId);
    if (cached) {
      return cached;
    }

    const request$ = this.#http
      .get<ExternalIdsResponse>(this.#getUrl(partnerId), { context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true) })
      .pipe(
        map(response =>
          (response?.providers ?? []).map(provider => ({
            externalIds: provider.external_ids ?? [],
            provider: provider.provider,
          })),
        ),
        catchError((error: unknown) => {
          this.#cache.delete(partnerId);
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.#cache.set(partnerId, request$);
    return request$;
  }

  #getUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/external-ids`;
  }
}
