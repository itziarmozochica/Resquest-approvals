import type { SalesRoutingResponse } from '../models/api/sales-routing-response.model';
import type { SalesRouting } from '../models/sales-routing.model';
import { adaptPlanApi } from './adapt-plan-api';

export function adaptSalesRoutingResponse(body: SalesRoutingResponse): SalesRouting | null {
  const data = body.data;
  if (data === null) {
    return null;
  }

  return {
    plans: data.plans.map(adaptPlanApi),
    retailSetupType: data.retail_setup_type,
  };
}
