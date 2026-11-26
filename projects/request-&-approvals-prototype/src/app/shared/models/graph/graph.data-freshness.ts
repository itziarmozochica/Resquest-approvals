export interface GraphDataFreshnessResponse {
  partner_id: number;
  plan_id: number;
  last_data: string | null;
  last_refresh: string | null;
}

export interface GraphDataFreshness {
  lastData: string | null;
  lastRefresh: string | null;
}
