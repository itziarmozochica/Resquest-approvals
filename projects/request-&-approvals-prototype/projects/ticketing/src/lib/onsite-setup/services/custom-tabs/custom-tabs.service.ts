import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { BaseResponse } from '@fz/http-models';
import { assertIsDefined } from '@fz/utils/assert-is-defined';
import { defer, map, type Observable } from 'rxjs';

import { TICKETING_CONFIG, type TicketingConfig } from '../../../ticketing.config';
import { adaptCustomTabForDateResponse } from '../../api-adapters/custom-tabs/adapt-custom-tab-for-date-response';
import { mapToCustomTabForDateParams } from '../../api-mappers/custom-tabs/map-to-custom-tab-for-date-params';
import type { CustomTabForDateApi } from '../../models/custom-tabs/api/custom-tab-for-date-response.model';
import type { CustomTabForDateQuery } from '../../models/custom-tabs/custom-tabs-query.model';
import type { CustomTile } from '../../models/custom-tabs/custom-tile.model';

@Injectable()
export class TicketingCustomTabsService {
  readonly #config: TicketingConfig = inject(TICKETING_CONFIG);
  readonly #http = inject(HttpClient);

  getCustomTabForDate(query: CustomTabForDateQuery): Observable<readonly CustomTile[]> {
    return defer(() =>
      this.#http.get<BaseResponse<CustomTabForDateApi>>(this.#customTabForDateUrl(query), {
        params: mapToCustomTabForDateParams(query),
      }),
    ).pipe(map(unwrapCustomTabForDateResponse));
  }

  #customTabForDateUrl(query: CustomTabForDateQuery): string {
    const gateway = this.#config.gatewayBaseUrl;
    if (gateway === undefined) {
      throw new Error('TicketingCustomTabsService: custom-tab calls need TICKETING_CONFIG.gatewayBaseUrl, which the host did not provide.');
    }

    return `${gateway}/1.0/partners/${query.partnerId}/onsite-setup-custom-tab/${query.customTabSetupId}/custom-tab-for-date`;
  }
}

function unwrapCustomTabForDateResponse(response: BaseResponse<CustomTabForDateApi>): readonly CustomTile[] {
  const data = response.data;
  assertIsDefined(data);

  return adaptCustomTabForDateResponse(data);
}
