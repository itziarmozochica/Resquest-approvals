import { RealTimeDashboardSlug, RealTimeDashboardSlugET } from '../models/real-time-dashboard-slug';

export const REAL_TIME_GRANT_SLUG_BY_EXTERNAL_ID: ReadonlyMap<number, RealTimeDashboardSlugET> = new Map<number, RealTimeDashboardSlugET>([
  [-1, RealTimeDashboardSlug.BigLaunches],
  [-2, RealTimeDashboardSlug.Attendance],
]);

export const REAL_TIME_CATALOG_TIMEOUT_MS = 2000;
