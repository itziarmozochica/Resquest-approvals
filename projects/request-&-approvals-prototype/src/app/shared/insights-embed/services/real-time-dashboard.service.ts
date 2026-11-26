import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AuthenticationService } from '@fz-original/app/core/authentication/authentication.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import { RealTimeDashboardSlugET } from '../models/real-time-dashboard-slug';
import { RealTimeDashboard, RealTimeDashboardApiResponse, RealTimeDashboardsApiResponse } from '../models/real-time-dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class RealTimeDashboardService {
  readonly #authenticationService = inject(AuthenticationService);
  readonly #http = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);
  /**
   * The dashboard list is cached per partner, not the resolved dashboard: the endpoint ignores the
   * partner and returns every real time dashboard, so all the real time screens of a session share
   * a single request, and switching partner without reloading no longer resolves the dashboard of
   * the previous partner (PRD-4267).
   */
  readonly #dashboardsByPartner = new Map<number, Observable<RealTimeDashboardsApiResponse>>();

  getDashboard(slug: RealTimeDashboardSlugET): Observable<RealTimeDashboard> {
    const partnerId = this.#getPartnerId();

    return this.#getDashboards(partnerId).pipe(map(response => this.#findDashboardBySlug(response, slug)));
  }

  #findDashboardBySlug(response: RealTimeDashboardsApiResponse, slug: RealTimeDashboardSlugET): RealTimeDashboard {
    const dashboard = response.find(item => item.slug === slug);
    if (dashboard === undefined) {
      throw new Error('Real time dashboard not found');
    }

    return this.#mapDashboard(dashboard);
  }

  #getDashboards(partnerId: number): Observable<RealTimeDashboardsApiResponse> {
    const cachedDashboards$ = this.#dashboardsByPartner.get(partnerId);
    if (cachedDashboards$ !== undefined) {
      return cachedDashboards$;
    }

    const dashboards$ = this.#http
      .get<RealTimeDashboardsApiResponse>(`${environment.insightsDashboardsApiBaseUrl}/partner/${partnerId}/realtime/dashboards`, {
        headers: this.#getRequestHeaders(),
      })
      .pipe(
        // A cached failure would outlive the visit, so the entry is evicted and the next call retries.
        catchError((error: unknown) => {
          this.#dashboardsByPartner.delete(partnerId);
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.#dashboardsByPartner.set(partnerId, dashboards$);

    return dashboards$;
  }

  #getPartnerId(): number {
    const partnerId = this.#partnerService.getPartner()?.id ?? null;
    if (partnerId === null) {
      throw new Error('Partner ID was not found');
    }
    return partnerId;
  }

  #getRequestHeaders(): HttpHeaders {
    if (this.#authenticationService.hasApiKey()) {
      return new HttpHeaders({ 'x-api-key': this.#authenticationService.getApiKey() ?? '' });
    }

    const token = this.#authenticationService.getToken();
    if (token === null) {
      throw new Error('Authentication token was not found');
    }

    return new HttpHeaders({ Authorization: `B2bToken ${token}` });
  }

  #mapDashboard(dashboard: RealTimeDashboardApiResponse): RealTimeDashboard {
    return {
      id: dashboard['id_'],
      name: dashboard.name,
      slug: dashboard.slug,
    };
  }
}
