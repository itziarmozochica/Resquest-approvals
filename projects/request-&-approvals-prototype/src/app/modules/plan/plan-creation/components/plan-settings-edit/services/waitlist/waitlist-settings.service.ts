import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PlanType } from '@fz-original/app/modules/event-settings/models/general-section.enum';
import { WaitlistSettingsAdapter } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/waitlist/waitlist-settings.adapter';
import {
  WaitlistSettings,
  WaitlistSettingsData,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/waitlist/waitlist-settings.model';
import { PlanSettingsFetcher } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/services/plan-settings-fetcher';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class WaitlistSettingsService implements PlanSettingsFetcher<WaitlistSettings | null> {
  #http = inject(HttpClient);
  #waitlistSettingsAdapter = inject(WaitlistSettingsAdapter);

  readonly planType = PlanType.waitlist;

  fetchSettings(partnerId: number, planId: number): Observable<WaitlistSettings | null> {
    return this.getWaitlistSettings(partnerId, planId);
  }

  getWaitlistSettings(partnerId: number, planId: number): Observable<WaitlistSettings | null> {
    return this.#http
      .get<
        BaseResponse<WaitlistSettingsData>
      >(`${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/waitlist-configuration/`)
      .pipe(
        map(response => this.#waitlistSettingsAdapter.fromApi(response)),
        catchError(error => {
          if (error?.status === 404) {
            return of(null);
          }
          return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
        }),
      );
  }

  saveWaitlistSettings(partnerId: number, planId: number, settings: WaitlistSettings): Observable<WaitlistSettings> {
    const payload: WaitlistSettingsData = this.#waitlistSettingsAdapter.toApi(settings);
    return this.#http
      .put<
        BaseResponse<WaitlistSettingsData>
      >(`${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/waitlist-configuration/`, payload)
      .pipe(
        map(response => this.#waitlistSettingsAdapter.fromApi(response)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }
}
