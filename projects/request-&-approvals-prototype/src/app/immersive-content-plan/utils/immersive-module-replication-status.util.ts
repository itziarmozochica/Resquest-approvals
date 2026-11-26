import type { ModuleReplicationState, ReplicationRowStatus } from '../models/store/immersive-module-replication-store.model';
import { retryJobsFrom } from './immersive-module-replication-results.util';

export function deriveApplyStatus(modules: Readonly<Record<string, ModuleReplicationState>>): ReplicationRowStatus {
  const states = Object.values(modules);
  if (states.some(({ status }) => status === 'sending')) {
    return 'inProgress';
  }
  const hasFailure =
    retryJobsFrom(modules, Object.keys(modules)).length > 0 ||
    states.some(({ status }) => status === 'error' || status === 'forbidden' || status === 'notSent');
  if (hasFailure) {
    return 'error';
  }
  return states.length > 0 && states.every(({ status }) => status === 'done') ? 'done' : 'pending';
}
