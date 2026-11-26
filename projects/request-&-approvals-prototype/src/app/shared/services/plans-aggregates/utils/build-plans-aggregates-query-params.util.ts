import { KindOption } from '@fz-original/app/shared/models/plan/kind-option.model';
import { PlanFilterOption } from '@fz-original/app/shared/models/plan/plan-filter.model';
import { PlanKind } from '@fz-original/app/shared/models/plan/plan-kind.enum';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';
import { PlansAggregatesQueryParams } from '@fz-original/app/shared/models/plans-aggregates/plans-aggregates-query-params.model';

export interface PlansAggregatesFilterState {
  cityId?: number | null;
  kind?: KindOption | null;
  name?: string | null;
  placeId?: number | null;
  planId?: number | null;
  status?: PlanFilterOption | null;
}

export const buildPlansAggregatesQueryParams = (filters: PlansAggregatesFilterState): PlansAggregatesQueryParams => ({
  city_id: filters.cityId ?? undefined,
  kind: filters.kind && filters.kind.id !== PlanKind.ALL ? filters.kind.id : undefined,
  name: filters.name ? filters.name : undefined,
  place_id: filters.placeId ?? undefined,
  plan_id: filters.planId ?? undefined,
  status: filters.status && filters.status.id !== PlanStatus.ALL ? filters.status.id : undefined,
});

export const plansAggregatesQueryParamsEqual = (left: PlansAggregatesQueryParams, right: PlansAggregatesQueryParams): boolean =>
  left.status === right.status &&
  left.kind === right.kind &&
  left.city_id === right.city_id &&
  left.place_id === right.place_id &&
  left.plan_id === right.plan_id &&
  left.name === right.name;
