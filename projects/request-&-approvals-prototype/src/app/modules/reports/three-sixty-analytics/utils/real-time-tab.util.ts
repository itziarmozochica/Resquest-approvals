import { REAL_TIME_GRANT_SLUG_BY_EXTERNAL_ID } from '@fz-original/app/shared/insights-embed/constants/real-time-grant.constants';
import { RealTimeDashboardSlugET } from '@fz-original/app/shared/insights-embed/models/real-time-dashboard-slug';

import { GraphType } from '../../../../shared/models/graph/graph-type.enum';
import { Graph } from '../../../../shared/models/graph/graph.model';
import { REAL_TIME_TAB_BY_SLUG, RealTimeTabDescriptor } from '../constants/real-time-tab.constants';

export function isRealTimeTabGraph(graph: Graph | null): boolean {
  return realTimeSlugForGraph(graph) !== null;
}

export function realTimeTabDescriptorForGraph(graph: Graph | null): RealTimeTabDescriptor | null {
  const slug = realTimeSlugForGraph(graph);

  return slug === null ? null : (REAL_TIME_TAB_BY_SLUG[slug] ?? null);
}

export function realTimeSlugForGraph(graph: Graph | null): RealTimeDashboardSlugET | null {
  if (graph === null) {
    return null;
  }

  return REAL_TIME_TAB_BY_SLUG[graph.id as RealTimeDashboardSlugET]?.slug ?? null;
}

export function replaceRealTimeGrantsWithTabs(graphs: Array<Graph>, resolvedSlugs: ReadonlySet<RealTimeDashboardSlugET>): Array<Graph> {
  const tabs: Array<Graph> = [];
  const grantedSlugs = new Set<RealTimeDashboardSlugET>();

  for (const graph of graphs) {
    const grantedSlug: RealTimeDashboardSlugET | undefined =
      graph.externalId === null ? undefined : REAL_TIME_GRANT_SLUG_BY_EXTERNAL_ID.get(graph.externalId);

    if (grantedSlug === undefined) {
      tabs.push(graph);
      continue;
    }

    const descriptor: RealTimeTabDescriptor | undefined = REAL_TIME_TAB_BY_SLUG[grantedSlug];
    if (descriptor === undefined || !resolvedSlugs.has(grantedSlug) || grantedSlugs.has(grantedSlug)) {
      continue;
    }

    grantedSlugs.add(grantedSlug);
    // Labelled by the granting row, like every other tab on this bar: the catalog is where a report is
    // renamed, and a name held here instead would need a release to follow one.
    tabs.push(new Graph(grantedSlug, graph.name, '', '', GraphType.dashboard, '', null));
  }

  return tabs;
}
