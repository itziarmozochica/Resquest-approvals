import { Params } from '@angular/router';

import { ThreeSixtyQueryParams, ThreeSixtySelection } from '../three-sixty-analytics-filters/three-sixty-analytics-filters.model';

export function toThreeSixtyQueryParams({ cityIds, currency, placeIds, planIds, statuses }: ThreeSixtySelection): ThreeSixtyQueryParams {
  return {
    cityIds: cityIds.toString(),
    currency,
    placeIds: placeIds.toString(),
    planIds: planIds.toString(),
    statuses: statuses.toString(),
  };
}

export function areThreeSixtyQueryParamsEqual(next: ThreeSixtyQueryParams, current: Params): boolean {
  return (
    isSameString(next.cityIds, current.cityIds) &&
    isSameString(next.placeIds, current.placeIds) &&
    isSameString(next.planIds, current.planIds) &&
    isSameString(next.statuses, current.statuses) &&
    isSameCurrency(next.currency, current.currency)
  );
}

function isSameCurrency(next: string | undefined, current: unknown): boolean {
  return (next === undefined && current === undefined) || isSameString(next, current);
}

function isSameString(next: string | undefined, current: unknown): boolean {
  return typeof next === 'string' && typeof current === 'string' && next === current;
}
