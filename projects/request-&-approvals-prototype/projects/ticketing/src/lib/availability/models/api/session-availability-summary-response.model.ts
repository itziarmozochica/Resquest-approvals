import type { BaseResponse } from '@fz/http-models';

import type { SessionApi, SharedAvailabilityBudgetApi } from './session.model';

export interface TimeslotSummaryApi {
  capacity: number | null;
  sessions: SessionApi[];
  override_capacity?: number | null;
}

export interface DaySummaryApi {
  datetime_summaries: Record<string, TimeslotSummaryApi>;
}

export interface SessionAvailabilitySummaryApi {
  allow_multi_session_purchase: boolean;
  date_summaries: Record<string, DaySummaryApi>;
  has_explode_pipe: boolean;
  product_summaries: SessionApi[];
  timezone: string;
  next_available_date?: string | null;
  session_selector_type?: string | null;
  shared_availability_budgets?: Record<string, SharedAvailabilityBudgetApi> | null;
}

export type SessionAvailabilitySummaryResponse = BaseResponse<SessionAvailabilitySummaryApi>;
