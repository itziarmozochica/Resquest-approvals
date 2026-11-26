import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PlansAggregatesQueryParams } from '@fz-original/app/shared/models/plans-aggregates/plans-aggregates-query-params.model';
import { GetPlansAggregatesResponse } from '@fz-original/app/shared/models/plans-aggregates/plans-aggregates.model';
import {
  buildPlansAggregatesHttpParams,
  buildPlansAggregatesUrl,
} from '@fz-original/app/shared/services/plans-aggregates/utils/plans-aggregates-api.util';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PlansAggregatesService {
  readonly #http = inject(HttpClient);

  getAggregates(partnerId: number, query: PlansAggregatesQueryParams = {}): Observable<GetPlansAggregatesResponse> {
    return this.#http.get<GetPlansAggregatesResponse>(buildPlansAggregatesUrl(partnerId), {
      params: buildPlansAggregatesHttpParams(query),
    });
  }
}
