import { BaseResponseDTO } from '../base-response';

export type AggregateType = 'big_int' | 'money';

export interface PlanAggregateItemBase {
  id: string;
  aggregate_type: AggregateType;
  metadata?: Record<string, unknown>;
}

export type PlanAggregateItem =
  | (PlanAggregateItemBase & { aggregate_type: 'big_int'; value: number })
  | (PlanAggregateItemBase & { aggregate_type: 'money'; value: number });

export interface PlansAggregatesData {
  aggregates: PlanAggregateItem[];
}

export type GetPlansAggregatesResponse = BaseResponseDTO<PlansAggregatesData>;
