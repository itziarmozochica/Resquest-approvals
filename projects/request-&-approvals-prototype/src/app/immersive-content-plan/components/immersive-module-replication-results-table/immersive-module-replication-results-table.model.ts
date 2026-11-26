import type { GroupedReplicationOutcome } from '../../models/immersive-module-replication.model';

export const GROUP_LABEL_KEYS: Record<GroupedReplicationOutcome['group'], string> = {
  failed: 'common.failed',
  skipped: 'planEdition.immersiveContentPlan.replication.tableGroupSkipped',
  updated: 'planEdition.immersiveContentPlan.replication.outcome.updated',
};
