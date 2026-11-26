import type { IgntIconName, IgntIconVariant } from '@ignite/icon';

import type { ModuleReplicationStatus, ReplicationRowStatus } from '../../models/store/immersive-module-replication-store.model';

const REPLICATION_KEY_PREFIX = 'planEdition.immersiveContentPlan.replication';

export type FooterMode = 'publishFailed' | 'results' | 'running';

export interface ReplicationRowIcon {
  name: IgntIconName;
  spin: boolean;
  variant: IgntIconVariant;
}

// Row and module statuses share one label map so the generic words stay in `common`/`global`.
export const STATUS_LABEL_KEYS: Record<ModuleReplicationStatus | ReplicationRowStatus, string> = {
  done: 'global.done',
  error: 'common.failed',
  forbidden: `${REPLICATION_KEY_PREFIX}.forbiddenStatus`,
  inProgress: 'common.inProgress',
  notSent: `${REPLICATION_KEY_PREFIX}.notSentStatus`,
  pending: 'common.pending',
  sending: 'common.inProgress',
};

export const ROW_STATUS_ICONS: Record<ReplicationRowStatus, ReplicationRowIcon> = {
  done: { name: 'check-circle', spin: false, variant: 'solid' },
  error: { name: 'times-circle', spin: false, variant: 'solid' },
  inProgress: { name: 'spinner', spin: true, variant: 'solid' },
  pending: { name: 'circle', spin: false, variant: 'regular' },
};

export interface ReplicationIntentCopyKeys {
  ctaKey: string;
  formTitleKey: string;
  runTitleKey: string;
  writeFailedBannerKey: string;
  writeRowLabelKey: string;
  writtenButApplyFailedKey: string;
}

// `revert-to-draft` never reaches the dialog: a revert changes no module, so nothing is offered.
export const REPLICATION_COPY_KEYS: Record<'publish' | 'save-draft', ReplicationIntentCopyKeys> = {
  publish: {
    ctaKey: `${REPLICATION_KEY_PREFIX}.publishAndApplyCta`,
    formTitleKey: `${REPLICATION_KEY_PREFIX}.formTitle`,
    runTitleKey: `${REPLICATION_KEY_PREFIX}.runTitle`,
    writeFailedBannerKey: `${REPLICATION_KEY_PREFIX}.publishFailedBanner`,
    writeRowLabelKey: `${REPLICATION_KEY_PREFIX}.statusPublishPlan`,
    writtenButApplyFailedKey: `${REPLICATION_KEY_PREFIX}.publishedButApplyFailed`,
  },
  'save-draft': {
    ctaKey: `${REPLICATION_KEY_PREFIX}.saveAndApplyCta`,
    formTitleKey: `${REPLICATION_KEY_PREFIX}.formTitleDraft`,
    runTitleKey: `${REPLICATION_KEY_PREFIX}.runTitleDraft`,
    writeFailedBannerKey: `${REPLICATION_KEY_PREFIX}.saveFailedBanner`,
    writeRowLabelKey: `${REPLICATION_KEY_PREFIX}.statusSavePlan`,
    writtenButApplyFailedKey: `${REPLICATION_KEY_PREFIX}.savedButApplyFailed`,
  },
};
