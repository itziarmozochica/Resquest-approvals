import { Graph } from '@fz-original/app/shared/models/graph/graph.model';

import { SINGLE_PLAN_DASHBOARD_EXTERNAL_IDS } from '../constants/single-plan-dashboards.constants';

/**
 * Whether a graph is one of the dashboards that only ever honour a single plan, so opening it
 * collapses the event selection. Takes the graph rather than reading `selectedGraph` because
 * `updateSelectedTab` needs to know it for the tab being opened, before the state is committed.
 */
export function isSinglePlanDashboardGraph(graph: Graph | null): boolean {
  const externalId: number | null | undefined = graph?.externalId;
  return externalId !== undefined && externalId !== null && SINGLE_PLAN_DASHBOARD_EXTERNAL_IDS.has(externalId);
}
