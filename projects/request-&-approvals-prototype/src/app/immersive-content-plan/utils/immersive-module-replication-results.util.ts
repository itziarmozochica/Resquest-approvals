import type { GroupedReplicationOutcome, ReplicationGroup, ReplicationResultItem } from '../models/immersive-module-replication.model';
import type { ModuleReplicationJob, ModuleReplicationState } from '../models/store/immersive-module-replication-store.model';
import { MAX_PLAN_IDS } from './immersive-module-replication-plan-ids.util';

const GROUP_ORDER: ReplicationGroup[] = ['updated', 'skipped', 'failed'];

function groupOf(item: ReplicationResultItem): ReplicationGroup {
  if (item.outcome === 'updated') {
    return 'updated';
  }
  if (item.outcome === 'module_not_found' || item.outcome === 'layout_not_found') {
    return 'skipped';
  }
  return 'failed';
}

export function groupReplicationResults(results: readonly ReplicationResultItem[]): GroupedReplicationOutcome[] {
  return GROUP_ORDER.flatMap(group => {
    const items = results.filter(item => groupOf(item) === group);
    return items.length === 0 ? [] : [{ group, items }];
  });
}

// Only the plan ids that were requested are kept: the response is server data and never widens the fan-out.
export function mergeReplicationResults(
  previous: readonly ReplicationResultItem[],
  retried: readonly ReplicationResultItem[],
  requestedPlanIds: readonly number[],
): ReplicationResultItem[] {
  const requested = new Set(requestedPlanIds);
  const requestedRetried = retried.filter(item => requested.has(item.plan_id));
  const retriedByPlanId = new Map(requestedRetried.map(item => [item.plan_id, item]));
  const merged = previous.map(item => retriedByPlanId.get(item.plan_id) ?? item);
  const previousPlanIds = new Set(previous.map(item => item.plan_id));
  const appended = requestedRetried.filter(item => !previousPlanIds.has(item.plan_id));
  return [...merged, ...appended];
}

function retryPlanIdsOf({ planIds, results, status }: ModuleReplicationState): number[] {
  if (status === 'done') {
    return results.filter(item => groupOf(item) === 'failed').map(item => item.plan_id);
  }
  if (status === 'error' || status === 'notSent') {
    const updated = new Set(results.filter(item => item.outcome === 'updated').map(item => item.plan_id));
    return planIds.filter(planId => !updated.has(planId));
  }
  return [];
}

export function retryJobsFrom(modules: Readonly<Record<string, ModuleReplicationState>>, order: readonly string[]): ModuleReplicationJob[] {
  return order.flatMap(moduleId => {
    const state = modules[moduleId];
    const planIds = state === undefined ? [] : retryPlanIdsOf(state).slice(0, MAX_PLAN_IDS);
    return planIds.length === 0 ? [] : [{ moduleId, planIds }];
  });
}
