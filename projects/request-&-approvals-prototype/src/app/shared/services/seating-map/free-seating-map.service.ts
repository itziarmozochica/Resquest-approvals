import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { DistributorTarget } from '@fz/reservations';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { FreeSeatingMapQuery } from '../../models/seating-map/free-seating-map-query';
import { FreeSeatingMap } from '../../models/seating-map/free-seating-map.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { DistributorRouteService, scopedOrganizationHeader } from '../distributor/distributor-route.service';
import { DISTRIBUTOR_PARTNER_NOT_SELECTED } from '../distributor/distributor-target.service';
import { FreeSeatingMapAdapter } from './free-seating-map.adapter';

@Injectable({
  providedIn: 'root',
})
export class FreeSeatingMapService {
  readonly #distributorRoute = inject(DistributorRouteService);
  readonly #freeSeatingMapAdapter = inject(FreeSeatingMapAdapter);
  readonly #http = inject(HttpClient);

  getFreeSeatingMap(seatingMapQuery: FreeSeatingMapQuery): Observable<BaseResponse<FreeSeatingMap>> {
    if (this.#distributorRoute.isBlocked()) {
      return this.#noPartnerChosen();
    }
    const target = this.#distributorRoute.pairTarget();
    if (this.#asksForAnotherPartner(target, seatingMapQuery.partnerId)) {
      return this.#noPartnerChosen();
    }
    if (target === null && seatingMapQuery.partnerId === undefined) {
      return throwError(() => new Error('Partner ID is required'));
    }
    const path: string = this.#getFreeSeatingMapUrl(target, seatingMapQuery);
    const params = this.#getParameters(seatingMapQuery, target);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#http.get(path, { headers, params }).pipe(
      switchMap((data: any) => of(this.#freeSeatingMapAdapter.fromApi(data))),
      catchError(error => throwError({ error: ErrorResponseUtils.getErrorResponseError(error) })),
    );
  }

  #asksForAnotherPartner(target: DistributorTarget | null, partnerId: number | undefined): boolean {
    return target !== null && partnerId !== undefined && partnerId !== target.distributorId && partnerId !== target.targetOrganizationId;
  }

  #getFreeSeatingMapUrl(target: DistributorTarget | null, seatingMapQuery: FreeSeatingMapQuery): string {
    const { partnerId, placeId, planId, seatingPoolId } = seatingMapQuery;
    const addressedPartnerId = target !== null ? target.targetOrganizationId : partnerId;
    const version = target !== null ? '/3.0' : '';
    return `${environment.apiBaseUrl}${version}/partners/${addressedPartnerId}/plans/${planId}/places/${placeId}/seating-pool/${seatingPoolId}/`;
  }

  #getParameters(seatingMapQuery: FreeSeatingMapQuery, target: DistributorTarget | null): HttpParams {
    let params = new HttpParams();

    params = this.#setQueryChannel(params, seatingMapQuery.channelId || seatingMapQuery.channel, target);

    if (seatingMapQuery.isHidden !== undefined) {
      params = params.set('is_hidden', seatingMapQuery.isHidden);
    }
    return params;
  }

  #noPartnerChosen(): Observable<BaseResponse<FreeSeatingMap>> {
    return of(new BaseResponse<FreeSeatingMap>(null, { code: DISTRIBUTOR_PARTNER_NOT_SELECTED, message: 'errors.generic' }));
  }

  /**
   * The callers outside the modify flow pass their own session's channel, which on the pair route asks
   * about the wrong concession - so there the chosen partner's channel wins. The partner route keeps
   * whatever the caller passed.
   */
  #setQueryChannel(params: HttpParams, callerChannel: string, target: DistributorTarget | null): HttpParams {
    if (target === null) {
      return params.set('channel', callerChannel);
    }
    const partnerChannel = this.#distributorRoute.pairChannel();
    return partnerChannel === undefined ? params : params.set('channel', partnerChannel);
  }
}
