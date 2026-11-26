import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { BaseResponse } from '@fz/http-models';
import { assertIsDefined } from '@fz/utils/assert-is-defined';
import { defer, map, type Observable } from 'rxjs';

import { TICKETING_CONFIG, type TicketingConfig } from '../../ticketing.config';
import { adaptOnsiteSetupsSummaryApi } from '../api-adapters/adapt-onsite-setups-summary-api';
import type { OnsiteSetup } from '../models/api/onsite-setup.api';
import type { OnsiteSetupsSummaryApi } from '../models/api/onsite-setups-summary.api';
import type { GetOnsiteSetupByPlaceQuery, GetOnsiteSetupQuery, OnsiteSetupQueryBase } from '../models/onsite-setup-query.model';
import type { OnsiteSetupsSummary } from '../models/onsite-setups-summary.model';

@Injectable()
export class TicketingOnsiteSetupService {
  readonly #config: TicketingConfig = inject(TICKETING_CONFIG);
  readonly #http = inject(HttpClient);

  getOnsiteSetup(query: GetOnsiteSetupQuery): Observable<OnsiteSetup> {
    return defer(() =>
      this.#http.get<BaseResponse<OnsiteSetup>>(`${this.#partnerUrl(query.partnerId)}/onsite-setups/${query.onsiteSetupId}`),
    ).pipe(map(unwrapOnsiteSetupResponse));
  }

  getOnsiteSetupByPlace(query: GetOnsiteSetupByPlaceQuery): Observable<OnsiteSetup> {
    return defer(() =>
      this.#http.get<BaseResponse<OnsiteSetup>>(
        `${this.#partnerUrl(query.partnerId)}/places/${query.placeId}/onsite-setups/${query.onsiteSetupId}`,
      ),
    ).pipe(map(unwrapOnsiteSetupResponse));
  }

  getOnsiteSetupsSummary(query: OnsiteSetupQueryBase): Observable<OnsiteSetupsSummary> {
    return defer(() =>
      this.#http.get<BaseResponse<OnsiteSetupsSummaryApi>>(`${this.#partnerUrl(query.partnerId)}/onsite-setups/summary`),
    ).pipe(map(response => adaptOnsiteSetupsSummaryApi(response.data)));
  }

  #partnerUrl(partnerId: string): string {
    const gateway = this.#config.gatewayBaseUrl;
    if (gateway === undefined) {
      throw new Error(
        'TicketingOnsiteSetupService: onsite-setup calls need TICKETING_CONFIG.gatewayBaseUrl, which the host did not provide.',
      );
    }

    return `${gateway}/1.0/partners/${partnerId}`;
  }
}

function unwrapOnsiteSetupResponse(response: BaseResponse<OnsiteSetup>): OnsiteSetup {
  const data = response.data;
  assertIsDefined(data);

  return data;
}
