import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PlanType } from '@fz-original/app/modules/event-settings/models/general-section.enum';
import { AuctionSettingsAdapter } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/auction/auction-settings.adapter';
import {
  AuctionSettings,
  AuctionSettingsData,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/auction/auction-settings.model';
import { PlanSettingsFetcher } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/services/plan-settings-fetcher';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuctionSettingsService implements PlanSettingsFetcher<AuctionSettings | null> {
  #auctionSettingsAdapter = inject(AuctionSettingsAdapter);
  #http = inject(HttpClient);

  readonly planType = PlanType.auction;

  fetchSettings(partnerId: number, planId: number): Observable<AuctionSettings | null> {
    return this.getAuctionSettings(partnerId, planId);
  }

  getAuctionSettings(partnerId: number, planId: number): Observable<AuctionSettings | null> {
    return this.#http
      .get<BaseResponse<AuctionSettingsData>>(`${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/auction-settings/`)
      .pipe(
        map(response => this.#auctionSettingsAdapter.fromApi(response)),
        catchError(error => {
          if (error?.status === 404) {
            return of(null);
          }
          return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
        }),
      );
  }

  saveAuctionSettings(partnerId: number, planId: number, settings: AuctionSettings): Observable<AuctionSettings> {
    const payload: AuctionSettingsData = this.#auctionSettingsAdapter.toApi(settings);
    return this.#http.put<void>(`${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/auction-settings/`, payload).pipe(
      map(() => settings),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }
}
