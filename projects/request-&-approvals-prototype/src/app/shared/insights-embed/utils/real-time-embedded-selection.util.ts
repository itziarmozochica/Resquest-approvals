import { RealTimeFiltersEmbeddedSelection } from '../models/real-time-embedded-selection.model';

/**
 * Drops what the Insights API rejects, deduplicates, and only then caps (PRD-4640).
 *
 * The order matters and mirrors the backend's: `main_plan_ids` items are validated as `int gt=0`
 * and the per-dashboard limit is checked against the deduplicated list, so capping first would
 * discard plans the backend would have accepted.
 *
 * The `undefined` in the input type is not defensive: `RealTimeFiltersComponent` can build a
 * `planIds` holding one when no plan option matches, and this is the funnel that keeps it from
 * reaching the portal.
 */
export function sanitizePlanIds(planIds: ReadonlyArray<number | undefined | null>, maxPlanIds: number): number[] {
  const uniquePlanIds = new Set<number>();

  for (const planId of planIds) {
    if (typeof planId !== 'number' || !Number.isInteger(planId) || planId <= 0) continue;

    uniquePlanIds.add(planId);
    if (uniquePlanIds.size === maxPlanIds) break;
  }

  return [...uniquePlanIds];
}

/**
 * Single source of truth for the payload the Insights Portal receives (PRD-4267).
 *
 * The same object travels through two channels — the `real_time_reports_selection` cookie and the
 * `FEVERZONE_EMBEDDED_FILTERS_UPDATE` post message — so building it twice makes the portal receive
 * two different selections depending on which path it reads. Sanitizing here, and only here, keeps
 * that guarantee: both channels get the same capped, deduplicated list.
 */
export function toRealTimeEmbeddedSelection(
  selection: { currency?: string; planIds: ReadonlyArray<number | undefined | null> } | null,
  partnerId: number | null,
  maxPlanIds: number,
): RealTimeFiltersEmbeddedSelection | null {
  if (selection === null || partnerId === null) return null;

  return {
    currency: selection.currency ?? '',
    partnerId,
    planIds: sanitizePlanIds(selection.planIds, maxPlanIds),
  };
}
