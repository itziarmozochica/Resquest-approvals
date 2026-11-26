import type { DistributionsResponse } from '../../models/api/product-variations/distributions-response.model';
import type { Distributions } from '../../models/product-variations/distributions.model';
import { adaptDistributionPlanApi } from './adapt-distribution-plan-api';

export function adaptDistributionsResponse(body: DistributionsResponse): Distributions {
  if (body.data === null) {
    return { plans: [] };
  }

  return {
    plans: body.data.plans.map(adaptDistributionPlanApi),
  };
}
