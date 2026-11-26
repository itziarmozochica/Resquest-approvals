import { PlanAggregateId } from '@fz-original/app/shared/models/plans-aggregates/plan-aggregate-id.enum';

const AGGREGATE_GHOST_VALUES: Record<PlanAggregateId, string> = {
  [PlanAggregateId.EventCount]: '0',
  [PlanAggregateId.SessionsThisWeek]: '00',
  [PlanAggregateId.TicketsSold]: '0,000',
  [PlanAggregateId.GrossRevenue]: '0,000',
};

export const getAggregateKpiGhostValue = (id: string): string => AGGREGATE_GHOST_VALUES[id as PlanAggregateId] ?? '0,000';
