import { RealTimeDashboardSlug, RealTimeDashboardSlugET } from './real-time-dashboard-slug';

/**
 * `main_plan_ids` limits enforced by the Insights API (data-insights-portal-api#83). Over the limit
 * the API answers `422` and the portal renders a generic error, so the frontend never lets a
 * selection grow past them.
 *
 * ⚠️ These values are NOT discoverable: `GET /partner/{id}/realtime/dashboards` returns `id_`,
 * `slug`, `name` and `widgets`, and `max_main_plan_ids` was left out of the DTO. If the backend
 * changes them, this mirror goes stale silently.
 */
export const MAX_MAIN_PLAN_IDS = 800;

export const MAX_MAIN_PLAN_IDS_BY_DASHBOARD_SLUG: Readonly<Record<RealTimeDashboardSlugET, number>> = {
  [RealTimeDashboardSlug.Attendance]: 50,
  [RealTimeDashboardSlug.BigLaunches]: MAX_MAIN_PLAN_IDS,
};

/**
 * The limit the frontend actually applies. It is deliberately LOWER than the backend one: the
 * selection reaches the portal through the `real_time_reports_selection` cookie, and
 * `encodeURIComponent(JSON.stringify())` crosses the browser's 4096-byte ceiling at roughly 442 ids
 * of 6 digits or 332 of 9. An oversized cookie is silently not written, and the portal's
 * `embeddedFiltersGuard` then sends the iframe to `/error/unavailable`.
 *
 * `real-time-embedded-contracts.spec.ts` measures the resulting cookie, so raising this needs a
 * measurement, not an opinion.
 */
export const MAX_EMBEDDED_PLAN_IDS = 300;

/**
 * How many plans each surface offers today. Separate from the two ceilings above on purpose: those
 * describe what the system can take, this one describes what we have decided to open, and it is the
 * dial the rollout turns (PRD-4640, §6).
 *
 * It is deliberately a number in a map and not a feature flag: there is no kill switch to forget to
 * remove, and opening a dashboard to partners is a one-line diff.
 */
const OFFERED_PLAN_IDS_BY_DASHBOARD_SLUG: Readonly<Record<RealTimeDashboardSlugET, number>> = {
  [RealTimeDashboardSlug.Attendance]: 50,
  [RealTimeDashboardSlug.BigLaunches]: MAX_EMBEDDED_PLAN_IDS,
};

/** Effective limit for a dashboard: whichever of the three bites first (PRD-4640, D1). */
export function maxPlanIdsForDashboard(slug: RealTimeDashboardSlugET): number {
  return Math.min(MAX_MAIN_PLAN_IDS_BY_DASHBOARD_SLUG[slug], MAX_EMBEDDED_PLAN_IDS, OFFERED_PLAN_IDS_BY_DASHBOARD_SLUG[slug]);
}
