import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, of, timeout } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PartnerService } from '../../../shared/services/partner/partner.service';
import { Theme, ThemedUrlResponse } from '../models/theme.model';
import { ThemeUtilsService } from './theme-utils.service';

@Injectable({
  providedIn: 'root',
})
export class BrandedEventPreviewService {
  #httpClient = inject(HttpClient);
  #partnerService = inject(PartnerService);
  #themeUtilsService = inject(ThemeUtilsService);

  getPreviewUrl(theme: Theme): Observable<string | null> {
    return this.#getPreviewUrlWithTheme(theme);
  }

  getPreviewUrlByPlanId(partnerId: number, planId: number): Observable<string | null> {
    return this.#getPreviewUrlWithPartnerId(partnerId, planId);
  }

  #getCurrentPartnerId(): number | undefined {
    const currentPartner = this.#partnerService.getPartner();
    return currentPartner?.id;
  }

  #getPreviewUrlPath(partnerId: number, themeData: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/theme/preview-url/?thm_data=${themeData}`;
  }

  #getPreviewUrlPathWithoutTheme(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/theme/preview-url/?main_plan_id=${planId}`;
  }

  #getPreviewUrlWithPartnerId(partnerId: number, planId: number): Observable<string | null> {
    if (!partnerId || !planId) {
      return of(null);
    }

    const path = this.#getPreviewUrlPathWithoutTheme(partnerId, planId);

    return this.#httpClient.get<ThemedUrlResponse>(path).pipe(
      timeout(30000),
      map((response: ThemedUrlResponse) => response.url || null),
      catchError(() => of(null)),
    );
  }

  #getPreviewUrlWithTheme(theme: Theme): Observable<string | null> {
    const partnerId = this.#getCurrentPartnerId();
    if (!partnerId) {
      return of(null);
    }

    const themeData = this.#themeUtilsService.encodeThemeData(theme);
    const path = this.#getPreviewUrlPath(partnerId, themeData);

    return this.#httpClient.get<ThemedUrlResponse>(path).pipe(
      timeout(30000),
      map((response: ThemedUrlResponse) => response.url || null),
      catchError(() => of(null)),
    );
  }
}
