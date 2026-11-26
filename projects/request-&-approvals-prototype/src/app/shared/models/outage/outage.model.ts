export interface OutageDto {
  id: string;
  affected_views: string[] | null;
  end_date: string | null;
  start_date: string;
  reason: string | null;
}

export interface Outage {
  id: string;
  affectedViews: string[] | null;
  endDate: string | null;
  startDate: string;
  reason: string | null;
}
