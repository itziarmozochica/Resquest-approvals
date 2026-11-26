import type { BaseResponse } from '@fz/http-models';

import type { PurchaseCloseEvaluation, PurchaseCloseEvaluationApi, PurchaseCloseQuery } from '../models/purchase-close.model';
import type { QueryParamValue } from '../models/query-params.model';

export function adaptPurchaseCloseEvaluation(response: BaseResponse<PurchaseCloseEvaluationApi>): PurchaseCloseEvaluation | null {
  return adaptData(response.data);
}

export function toPurchaseCloseParams(query: PurchaseCloseQuery): Record<string, QueryParamValue> {
  return {
    hours_from_current_day: query.hoursFromCurrentDay,
    ...(query.timezone !== undefined && { timezone: query.timezone }),
  };
}

function adaptData(data: PurchaseCloseEvaluationApi | null | undefined): PurchaseCloseEvaluation | null {
  const timestamp = data?.availability_timestamp;
  if (timestamp === null || timestamp === undefined) {
    return null;
  }
  return { availabilityDate: new Date(timestamp * 1000) };
}
