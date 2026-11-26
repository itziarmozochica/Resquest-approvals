import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { catchError, map, Observable, throwError } from 'rxjs';

import { AmbassadorTrackingLinkAdapter } from '../adapters/ambassador-tracking-link.adapter';
import { AmbassadorTrackingLink, AmbassadorTrackingLinkResponse } from '../models/ambassador-tracking-link.model';

@Injectable({
  providedIn: 'root',
})
export class AmbassadorTrackingLinkService {
  #ambassadorTrackingLinkAdapter = inject(AmbassadorTrackingLinkAdapter);
  #httpClient = inject(HttpClient);

  getTrackingLink(resellerId: number, mainPlanId: number, channelId: string, b2cSiteHost: string): Observable<AmbassadorTrackingLink[]> {
    const path = `${environment.apiBaseUrl}/resellers/${resellerId}/plans/${mainPlanId}/tracking-links/`;
    return this.#httpClient
      .get<BaseResponse<AmbassadorTrackingLinkResponse>>(path, {
        observe: 'response',
        params: { channel_id: channelId, b2c_site_host: b2cSiteHost },
      })
      .pipe(
        map((result: HttpResponse<BaseResponse<AmbassadorTrackingLinkResponse>>) => {
          return this.#ambassadorTrackingLinkAdapter.fromApi(result) || [];
        }),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  getTrackingLinkByPartnerId(
    partnerId: number,
    mainPlanId: number,
    channelId: string,
    b2cSiteHost: string,
  ): Observable<AmbassadorTrackingLink[]> {
    const path = `${environment.apiBaseUrl}/partners/${partnerId}/plans/${mainPlanId}/tracking-links/`;

    return this.#httpClient
      .get<BaseResponse<AmbassadorTrackingLinkResponse>>(path, {
        observe: 'response',
        params: { channel_id: channelId, b2c_site_host: b2cSiteHost },
      })
      .pipe(
        map((result: HttpResponse<BaseResponse<AmbassadorTrackingLinkResponse>>) => {
          return this.#ambassadorTrackingLinkAdapter.fromApi(result) || [];
        }),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }
}
