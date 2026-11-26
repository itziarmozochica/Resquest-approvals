import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PlanType } from '@fz-original/app/modules/event-settings/models/general-section.enum';
import { PrizeDrawSettingsAdapter } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/prize-draw/prize-draw-settings.adapter';
import {
  PrizeDrawSettings,
  PrizeDrawSettingsData,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/prize-draw/prize-draw-settings.model';
import { PlanSettingsFetcher } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/services/plan-settings-fetcher';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PrizeDrawSettingsService implements PlanSettingsFetcher<PrizeDrawSettings | null> {
  #http = inject(HttpClient);
  #prizeDrawSettingsAdapter = inject(PrizeDrawSettingsAdapter);

  readonly planType = PlanType.prizeDraw;

  fetchSettings(partnerId: number, planId: number): Observable<PrizeDrawSettings | null> {
    return this.getPrizeDrawSettings(partnerId, planId);
  }

  getPrizeDrawSettings(partnerId: number, planId: number): Observable<PrizeDrawSettings | null> {
    return this.#http
      .get<BaseResponse<PrizeDrawSettingsData>>(`${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/draw-settings/`)
      .pipe(
        map(response => this.#prizeDrawSettingsAdapter.fromApi(response)),
        catchError(error => {
          if (error?.status === 404) {
            return of(null);
          }
          return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
        }),
      );
  }

  savePrizeDrawSettings(partnerId: number, planId: number, settings: PrizeDrawSettings): Observable<PrizeDrawSettings> {
    const payload: PrizeDrawSettingsData = this.#prizeDrawSettingsAdapter.toApi(settings);
    return this.#http.put<void>(`${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/draw-settings/`, payload).pipe(
      map(() => settings),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }
}
