/* eslint-disable @typescript-eslint/naming-convention */
import { ListPlanItem } from '../../../../modules/attendees/list-attendees/models/list-plan-item.model';
import { PlanOption } from '../../../../shared/search-bar/models/plan-option.model';

function mixPlanBuilderParsePartner(plan: PlanOption | ListPlanItem): any {
  return {
    plan_ID: plan.id,
    plan_name: plan.name,
  };
}

export function mixPlanBuilder(data: any): any {
  if (!data || !data.plan) {
    return data;
  }

  const { plan, ...restElements } = data;
  return {
    ...restElements,
    ...mixPlanBuilderParsePartner(plan),
  };
}
