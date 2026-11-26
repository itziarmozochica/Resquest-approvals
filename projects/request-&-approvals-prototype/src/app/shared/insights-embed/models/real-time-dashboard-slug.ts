import { InjectionToken } from '@angular/core';

/**
 * Slugs that identify each real time dashboard in the Insights API (PRD-4267).
 *
 * These values cross the frontend boundary: they are the only thing that tells the API which
 * dashboard to resolve, so renaming one compiles cleanly and only fails in production. The big
 * launches slug is `real-time-sales-summary`, so the screen name cannot be derived from the slug.
 */
export const RealTimeDashboardSlug = {
  Attendance: 'real-time-attendance',
  BigLaunches: 'real-time-sales-summary',
} as const;

export type RealTimeDashboardSlugET = (typeof RealTimeDashboardSlug)[keyof typeof RealTimeDashboardSlug];

/** Provided by each real time dashboard page, consumed by the shared page logic. */
export const REAL_TIME_DASHBOARD_SLUG = new InjectionToken<RealTimeDashboardSlugET>('REAL_TIME_DASHBOARD_SLUG');
