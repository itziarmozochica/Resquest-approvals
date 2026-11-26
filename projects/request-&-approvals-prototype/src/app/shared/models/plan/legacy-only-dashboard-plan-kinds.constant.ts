import { PlanKind } from './plan-kind.enum';

/**
 * Plan kinds whose dashboards live in their own graph group (`waitlist`, `auction`,
 * `prize-draw`) instead of `analytics-360`. The new dashboard has nothing to render for
 * them, so they keep resolving to the legacy plan dashboard.
 */
export const LEGACY_ONLY_DASHBOARD_PLAN_KINDS: ReadonlySet<PlanKind> = new Set([PlanKind.AUCTION, PlanKind.PRIZE_DRAW, PlanKind.WAITLIST]);
