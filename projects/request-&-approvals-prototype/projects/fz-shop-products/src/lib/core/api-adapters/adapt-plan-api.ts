import type { PlanApi } from '../models/api/plan-api.model';
import type { Plan } from '../models/plan.model';

export function adaptPlanApi(plan: PlanApi): Plan {
  return {
    id: plan.id,
    name: plan.name,
    placeName: plan.place_name,
  };
}
