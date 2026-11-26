import { ListPlanItem } from '../../../modules/attendees/list-attendees/models/list-plan-item.model';
import { PlanReviewRequestStatus } from '../../models/plan-review/plan-review-request.model';
import { PlanKind } from '../../models/plan/plan-kind.enum';
import { PlanStatus } from '../../models/plan/plan-status.enum';

export interface ReviewStatusFilterDefinition {
  id: string;
  reviewStatuses: PlanReviewRequestStatus[];
}

export interface ListPlanSearchFilterContext {
  cityId?: number | null;
  kind?: PlanKind | string | null;
  placeId?: number | null;
}

export function filterListPlansByContext(plans: ListPlanItem[], context: ListPlanSearchFilterContext): ListPlanItem[] {
  const hasCityFilter = context.cityId != null;
  const hasPlaceFilter = context.placeId != null;

  return plans.filter(plan => {
    const places = plan.places ?? [];

    if ((hasCityFilter || hasPlaceFilter) && places.length === 0) {
      return false;
    }

    if (hasCityFilter && !places.some(place => place.cityId === context.cityId)) {
      return false;
    }

    if (hasPlaceFilter && !places.some(place => place.id === context.placeId)) {
      return false;
    }

    if (context.kind != null && plan.kind !== context.kind) {
      return false;
    }

    return true;
  });
}

export function getDistinctPlanKinds(plans: ListPlanItem[]): PlanKind[] {
  const kinds = plans.map(plan => plan.kind).filter((kind): kind is PlanKind => kind !== undefined);

  return [...new Set(kinds)];
}

export function getDistinctPlanStatuses(plans: ListPlanItem[]): PlanStatus[] {
  const statuses = plans.map(plan => plan.status).filter((status): status is PlanStatus => status !== undefined);

  return [...new Set(statuses)];
}

export function getVisibleReviewStatusFilterIds(
  plans: ListPlanItem[],
  filterDefinitions: ReadonlyArray<ReviewStatusFilterDefinition>,
): string[] {
  const reviewStatusesInScope = new Set(
    plans.map(plan => plan.reviewStatus).filter((status): status is PlanReviewRequestStatus => status != null),
  );

  if (reviewStatusesInScope.size === 0) {
    return [];
  }

  return filterDefinitions
    .filter(definition => definition.reviewStatuses.some(status => reviewStatusesInScope.has(status)))
    .map(definition => definition.id);
}
