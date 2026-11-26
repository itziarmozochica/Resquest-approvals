import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { DistributorTarget } from '@fz/reservations';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { SeatingConfigurationQuery } from '../../models/seating-configuration/seating-configuration-query';
import { SeatingConfiguration } from '../../models/seating-configuration/seating-configuration.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { DistributorRouteService, scopedOrganizationHeader } from '../distributor/distributor-route.service';
import { DISTRIBUTOR_PARTNER_NOT_SELECTED } from '../distributor/distributor-target.service';
import { SeatingConfigurationAdapter } from './seating-configuration.adapter';

@Injectable({
  providedIn: 'root',
})
export class SeatingConfigurationService {
  readonly #distributorRoute = inject(DistributorRouteService);
  readonly #http = inject(HttpClient);
  readonly #seatingConfigurationAdapter = inject(SeatingConfigurationAdapter);

  getSeatingConfiguration(seatingConfigurationQuery: SeatingConfigurationQuery): Observable<BaseResponse<SeatingConfiguration | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return this.#noPartnerChosen();
    }
    const target = this.#distributorRoute.pairTarget();
    if (this.#asksForAnotherPartner(target, seatingConfigurationQuery.partnerId)) {
      return this.#noPartnerChosen();
    }
    const path: string = this.#getSeatingConfigurationUrl(target, seatingConfigurationQuery);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#http.get(path, { headers }).pipe(
      map((data: any) => this.#seatingConfigurationAdapter.fromApi(data)),
      catchError(error => throwError(() => ({ error: ErrorResponseUtils.getErrorResponseError(error) }))),
    );
  }

  #asksForAnotherPartner(target: DistributorTarget | null, partnerId: number | undefined): boolean {
    return target !== null && partnerId !== undefined && partnerId !== target.distributorId && partnerId !== target.targetOrganizationId;
  }

  #getSeatingConfigurationUrl(target: DistributorTarget | null, seatingConfigurationQuery: SeatingConfigurationQuery): string {
    const { partnerId, planId, sessionId } = seatingConfigurationQuery;
    const addressedPartnerId = target !== null ? target.targetOrganizationId : partnerId;
    const version = target !== null ? '/3.0' : '';
    return `${environment.apiBaseUrl}${version}/partners/${addressedPartnerId}/plans/${planId}/sessions/${sessionId}/seating-configuration/`;
  }

  #noPartnerChosen(): Observable<BaseResponse<SeatingConfiguration | null>> {
    return of(new BaseResponse<SeatingConfiguration | null>(null, { code: DISTRIBUTOR_PARTNER_NOT_SELECTED, message: 'errors.generic' }));
  }
}
