import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, of, timeout } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PartnerService } from '../../../shared/services/partner/partner.service';
import { Theme } from '../models/theme.model';
import { ThemeUtilsService } from './theme-utils.service';

export interface PurchaseConfirmationPreviewResponse {
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class PurchaseConfirmationPreviewService {
  #httpClient = inject(HttpClient);
  #partnerService = inject(PartnerService);
  #themeUtilsService = inject(ThemeUtilsService);

  getPreviewUrl(theme: Theme, planId?: number): Observable<string | null> {
    return this.#getPreviewUrlWithTheme(theme, planId);
  }

  getPreviewUrlByPlanId(partnerId: number, planId: number): Observable<string | null> {
    return this.#getPreviewUrlWithPartnerId(partnerId, planId);
  }

  #getCurrentPartnerId(): number | undefined {
    const currentPartner = this.#partnerService.getPartner();
    return currentPartner?.id;
  }

  #getPreviewUrlPath(partnerId: number, planId: number | undefined, themeData: string): string {
    const baseUrl = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/theme/preview-purchase-confirmation-email/`;
    const params = new URLSearchParams();

    if (planId !== undefined) {
      params.append('main_plan_id', planId.toString());
    }
    params.append('thm_data', themeData);

    return `${baseUrl}?${params.toString()}`;
  }

  #getPreviewUrlPathWithoutTheme(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/theme/preview-purchase-confirmation-email/?main_plan_id=${planId}`;
  }

  #getPreviewUrlWithPartnerId(partnerId: number, planId: number): Observable<string | null> {
    if (!partnerId || !planId) {
      return of(null);
    }

    const path = this.#getPreviewUrlPathWithoutTheme(partnerId, planId);

    return this.#makeHttpRequest(path);
  }

  #getPreviewUrlWithTheme(theme: Theme, planId?: number): Observable<string | null> {
    const partnerId = this.#getCurrentPartnerId();
    if (!partnerId) {
      return of(null);
    }

    const themeData = this.#themeUtilsService.encodeThemeData(theme);
    const path = this.#getPreviewUrlPath(partnerId, planId, themeData);

    return this.#makeHttpRequest(path);
  }

  #makeHttpRequest(path: string): Observable<string | null> {
    const headers = new HttpHeaders({
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    });

    return this.#httpClient
      .get(path, {
        headers,
        responseType: 'text',
      })
      .pipe(
        timeout(30000),
        map((htmlContent: string) => {
          if (htmlContent?.trim()) {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            return URL.createObjectURL(blob);
          }
          return null;
        }),
        catchError(() => of(null)),
      );
  }
}
