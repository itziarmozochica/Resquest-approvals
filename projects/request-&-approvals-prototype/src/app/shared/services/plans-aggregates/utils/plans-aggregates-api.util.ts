import { HttpParams } from '@angular/common/http';

import { PlansAggregatesQueryParams } from '@fz-original/app/shared/models/plans-aggregates/plans-aggregates-query-params.model';
import { PLANS_AGGREGATES_API_PATH } from '@fz-original/app/shared/services/plans-aggregates/data/plans-aggregates-api.config';
import { environment } from '@fz-original/environments/environment';

export const buildPlansAggregatesUrl = (partnerId: number): string =>
  `${environment.apiGWBaseUrl}${PLANS_AGGREGATES_API_PATH.replace('{partnerId}', String(partnerId))}`;

export const buildPlansAggregatesHttpParams = (query: PlansAggregatesQueryParams): HttpParams => {
  let params = new HttpParams();

  if (query.status) {
    params = params.set('status', query.status);
  }
  if (query.kind) {
    params = params.set('kind', query.kind);
  }
  if (query.city_id !== undefined) {
    params = params.set('city_id', String(query.city_id));
  }
  if (query.place_id !== undefined) {
    params = params.set('place_id', String(query.place_id));
  }
  if (query.plan_id !== undefined) {
    params = params.set('plan_id', String(query.plan_id));
  }
  if (query.name) {
    params = params.set('name', query.name);
  }

  return params;
};
