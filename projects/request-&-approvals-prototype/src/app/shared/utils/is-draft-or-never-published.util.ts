import { PlanStatus } from '../models/plan/plan-status.enum';
import { Plan } from '../models/plan/plan.model';

/**
 * Mirrors what the legacy dashboard reads to pick its draft wizard and its ready panel:
 * draft status for the former, never having been published for the latter. `hasEverBeenPublished`
 * has to be explicitly `false`, since an endpoint that omits it would otherwise send every
 * unpublished-looking event to the legacy screen.
 */
export function isDraftOrNeverPublished(plan: Plan | null | undefined): boolean {
  if (plan == null) {
    return false;
  }
  if (plan.status === PlanStatus.DRAFT) {
    return true;
  }
  return plan.isPublished !== true && plan.hasEverBeenPublished === false;
}
