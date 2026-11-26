import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { OssCustomTilesData, OssCustomTilesDataDto } from '../models';
import { OssCustomTabSessionsForDateQuery } from './oss-custom-tab-sessions-for-date-query';
import { OssCustomTilesDataAdapter } from './oss-custom-tiles-data.adapter';

@Injectable({
  providedIn: 'root',
})
export class OssCustomTabsService {
  #httpClient = inject(HttpClient);
  #customTilesDataAdapter = inject(OssCustomTilesDataAdapter);

  getCustomTabSessionsForDate(query: OssCustomTabSessionsForDateQuery): Observable<BaseResponse<OssCustomTilesData>> {
    const path = this.#getCustomTabSessionsForDateUrl(query.partnerId, query.customTabSetupId);
    const params = new HttpParams().set('from_date', query.fromDate).set('channel', query.channel);

    return this.#httpClient.get<BaseResponse<OssCustomTilesDataDto>>(path, { params }).pipe(
      map(result => this.#customTilesDataAdapter.fromApi(result)),
      catchError(() => of(this.#customTilesDataAdapter.fromApi(new BaseResponse<OssCustomTilesDataDto>(null, null)))),
    );
  }

  #getCustomTabSessionsForDateUrl(partnerId: number, customTabSetupId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/onsite-setup-custom-tab/${customTabSetupId}/custom-tab-for-date`;
  }
}
