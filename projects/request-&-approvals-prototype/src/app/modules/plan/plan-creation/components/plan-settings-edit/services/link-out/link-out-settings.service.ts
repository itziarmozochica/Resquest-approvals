import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PlanType } from '@fz-original/app/modules/event-settings/models/general-section.enum';
import { LinkOutSettingsAdapter } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/link-out/link-out-settings.adapter';
import {
  LinkOutSettings,
  LinkOutSettingsData,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/link-out/link-out-settings.model';
import { PlanSettingsFetcher } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/services/plan-settings-fetcher';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { map, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LinkOutSettingsService implements PlanSettingsFetcher<LinkOutSettings> {
  #http = inject(HttpClient);
  #linkOutSettingsAdapter = inject(LinkOutSettingsAdapter);

  readonly planType = PlanType.linkOut;

  fetchSettings(partnerId: number, planId: number): Observable<LinkOutSettings> {
    return this.getLinkOutSettings(partnerId, planId);
  }

  getLinkOutSettings(partnerId: number, planId: number): Observable<LinkOutSettings> {
    return this.#http
      .get<BaseResponse<LinkOutSettingsData>>(`${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/link-outs/`)
      .pipe(
        map(response => this.#linkOutSettingsAdapter.fromApi(response)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  saveLinkOutSettings(partnerId: number, planId: number, settings: LinkOutSettings): Observable<LinkOutSettings> {
    const payload: LinkOutSettingsData = this.#linkOutSettingsAdapter.toApi(settings);
    return this.#http
      .put<BaseResponse<LinkOutSettingsData>>(`${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/link-outs/`, payload)
      .pipe(
        map(response => this.#linkOutSettingsAdapter.fromApi(response)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }
}
