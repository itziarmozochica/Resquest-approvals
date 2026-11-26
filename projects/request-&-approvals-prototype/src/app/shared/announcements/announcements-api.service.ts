import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { AnnouncementDescriptor, AnnouncementKey, AnnouncementsApiPort } from 'product-marketing';
import { map, of, type Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseResponse } from '../models/base-response';
import { FeatureFlags } from '../optimizely/feature-flags';
import { OptimizelyService } from '../optimizely/optimizely.service';
import { PartnerService } from '../services/partner/partner.service';

/**
 * The feature each announcement talks about, where there is one.
 *
 * The backend targets an announcement at a partner; whether *this app* can act on it is a
 * separate question, and a partner without the feature would be told about something they
 * cannot use. A key absent from here needs no feature and is always allowed.
 */
const REQUIRED_FEATURE_BY_KEY: Readonly<Record<AnnouncementKey, FeatureFlags>> = {
  'reservations-deposits': FeatureFlags.DEPOSITS,
};

/**
 * FeverZone implementation of the `product-marketing` backend gateway,
 * calling the partner-scoped announcements endpoints on the partners service.
 *
 * HTTP errors are left to propagate: the library's `AnnouncementService` is
 * fail-closed (a failed load shows nothing; a failed "seen" write is tolerated).
 */
@Injectable({ providedIn: 'root' })
export class AnnouncementsApiService implements AnnouncementsApiPort {
  readonly #httpClient = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);
  readonly #optimizely = inject(OptimizelyService);

  getEligibleAnnouncements(): Observable<readonly AnnouncementDescriptor[]> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      return of([]);
    }
    return this.#httpClient.get<BaseResponse<AnnouncementDescriptor[] | null>>(this.#announcementsUrl(partnerId)).pipe(
      // A non-array `data` would make the library's `for…of` throw, so narrow it here.
      map(response => (Array.isArray(response?.data) ? response.data : [])),
      map(descriptors => descriptors.filter(descriptor => this.#partnerHasFeature(descriptor.key))),
    );
  }

  /**
   * Whether this partner has the feature the announcement is about.
   *
   * Checked here rather than by registering the key conditionally, because registrations are
   * read when `AnnouncementService` is constructed — at bootstrap, before a partner is chosen
   * — while `setPartnerId` only reaches Optimizely once one is (`app.component.ts:143`). By
   * the time this call is made the partner is known, so the flag answers for the right one and
   * is re-asked whenever the admin switches partner.
   *
   * A flag that cannot be resolved reads as absent: the announcement is not shown. That
   * matches the library's fail-closed stance — better silent than promoting something the
   * partner cannot open.
   */
  #partnerHasFeature(key: AnnouncementKey): boolean {
    const requiredFeature = REQUIRED_FEATURE_BY_KEY[key];
    if (requiredFeature === undefined) {
      return true;
    }

    return this.#optimizely.isFeatureEnabled({ optimizelyFeatureKey: requiredFeature, team: 'b2b-resellers' }) ?? false;
  }

  markSeen(key: AnnouncementKey): Observable<void> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      return of(undefined);
    }
    return (
      this.#httpClient
        // `null`, not `{}`: the endpoint declares no `requestBody`.
        .post<BaseResponse<unknown>>(`${this.#announcementsUrl(partnerId)}/${encodeURIComponent(key)}/seen`, null)
        .pipe(map((): undefined => undefined))
    );
  }

  #announcementsUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/announcements`;
  }
}
