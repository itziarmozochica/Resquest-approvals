import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { DistributorTarget } from '@fz/reservations';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { SeatingMapQuery } from '../../models/seating-map/seating-map-query';
import { SeatingMap } from '../../models/seating-map/seating-map.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { DistributorRouteService, scopedOrganizationHeader } from '../distributor/distributor-route.service';
import { DISTRIBUTOR_PARTNER_NOT_SELECTED } from '../distributor/distributor-target.service';
import { SeatingMapAdapter } from './seating-map.adapter';

@Injectable({
  providedIn: 'root',
})
export class SeatingMapService {
  readonly #distributorRoute = inject(DistributorRouteService);
  readonly #http = inject(HttpClient);
  readonly #seatingMapAdapter = inject(SeatingMapAdapter);

  getSeatingMap(seatingMapQuery: SeatingMapQuery): Observable<BaseResponse<SeatingMap>> {
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
    const path: string = this.#getSeatingMapUrl(target, seatingMapQuery.partnerId);
    const params = this.#getSeatingMapParams(seatingMapQuery, target);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#http.get(path, { headers, params }).pipe(
      switchMap((data: any) => of(this.#seatingMapAdapter.fromApi(data))),
      catchError(error => throwError(() => ({ error: ErrorResponseUtils.getErrorResponseError(error) }))),
    );
  }

  #asksForAnotherPartner(target: DistributorTarget | null, partnerId: number | undefined): boolean {
    return target !== null && partnerId !== undefined && partnerId !== target.distributorId && partnerId !== target.targetOrganizationId;
  }

  /**
   * The callers outside the modify flow pass their own session's channel, which on the pair route asks
   * about the wrong concession - so there the chosen partner's channel wins. The partner route keeps
   * whatever the caller passed, including the literal `null` two of them produce.
   */
  #appendQueryChannel(params: HttpParams, callerChannel: string, target: DistributorTarget | null): HttpParams {
    if (target === null) {
      return params.append('channel', callerChannel);
    }
    const partnerChannel = this.#distributorRoute.pairChannel();
    return partnerChannel === undefined ? params : params.append('channel', partnerChannel);
  }

  #getSeatingMapParams(seatingMapQuery: SeatingMapQuery, target: DistributorTarget | null): HttpParams {
    let params = new HttpParams();

    if (seatingMapQuery.readonly !== undefined) {
      params = params.append('readonly', seatingMapQuery.readonly);
    }

    if (seatingMapQuery.numberOfSeats && seatingMapQuery.skipBsa !== true) {
      params = params.append('number_of_seats', seatingMapQuery.numberOfSeats);
    }

    if (seatingMapQuery.sessionIds) {
      if (seatingMapQuery.readonly) {
        params = params.append('session_ids', seatingMapQuery.sessionIds.join(','));
      } else {
        params = params.append('session_ids', seatingMapQuery.sessionIds[0]);
      }
    }

    if (seatingMapQuery.skipBsa === true) {
      params = params.append('skip_bsa', true);
    }

    return this.#appendQueryChannel(params, seatingMapQuery.channel as string, target);
  }

  #getSeatingMapUrl(target: DistributorTarget | null, partnerId: number | undefined): string {
    const addressedPartnerId = target !== null ? target.targetOrganizationId : partnerId;
    const version = target !== null ? '/3.0' : '';
    return `${environment.apiBaseUrl}${version}/partners/${addressedPartnerId}/seating-map/`;
  }

  #noPartnerChosen(): Observable<BaseResponse<SeatingMap>> {
    return of(new BaseResponse<SeatingMap>(null, { code: DISTRIBUTOR_PARTNER_NOT_SELECTED, message: 'errors.generic' }));
  }
}
