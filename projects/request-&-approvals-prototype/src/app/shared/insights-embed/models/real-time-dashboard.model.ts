export interface RealTimeDashboard {
  id: string;
  name: string;
  slug: string;
}

export interface RealTimeDashboardApiResponse {
  id_: string;
  name: string;
  slug: string;
  widgets: RealTimeDashboardWidgetApiResponse[];
}

export type RealTimeDashboardsApiResponse = RealTimeDashboardApiResponse[];

export interface RealTimeDashboardWidgetApiResponse {
  merge_strategy: string;
  name: string;
  slug: string;
}
