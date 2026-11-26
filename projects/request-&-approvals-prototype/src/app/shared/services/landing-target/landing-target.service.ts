import { inject, Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

import { PartnerExternalIdsService } from '../partner/partner-external-ids.service';

export const DEFAULT_TARGET_URLS: readonly string[] = ['/plans', '/'];

export function isDefaultTarget(navigateUrl: string): boolean {
  return DEFAULT_TARGET_URLS.includes(navigateUrl);
}

@Injectable({
  providedIn: 'root',
})
export class LandingTargetService {
  static readonly analyticsHomeUrl = '/analytics';
  static readonly externalIdsTimeoutMs = 2000;

  readonly #partnerExternalIdsService = inject(PartnerExternalIdsService);

  prefetch(partnerId: number): void {
    this.#partnerExternalIdsService.getExternalIds(partnerId).subscribe();
  }

  resolve(partnerId: number | undefined, fallbackUrl: string): Observable<string> {
    return this.#partnerExternalIdsService.isOneboxPartner(partnerId).pipe(
      timeout(LandingTargetService.externalIdsTimeoutMs),
      map(isOnebox => (isOnebox ? LandingTargetService.analyticsHomeUrl : fallbackUrl)),
      catchError(() => of(fallbackUrl)),
    );
  }
}
