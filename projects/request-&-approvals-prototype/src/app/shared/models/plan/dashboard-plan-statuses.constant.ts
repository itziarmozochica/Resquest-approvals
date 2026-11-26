import { PlanStatus } from './plan-status.enum';

/**
 * Every status the new dashboard's own filter offers, as the comma-separated `statuses` query param
 * it reads.
 *
 * An entry point that names one event has to send this: with no `statuses` in the url the filter
 * defaults to on sale, and a draft or off-sale event is then dropped from the options before it can
 * be selected — so the link lands on the empty state instead of on the event it pointed at.
 */
export const DASHBOARD_PLAN_STATUSES: string = [PlanStatus.DRAFT, PlanStatus.OFF_SALE, PlanStatus.ON_SALE].join(',');
