import type { PublishDiffKind, WorkingChange } from './immersive-layout-working.util';

// Mixpanel truncates list properties past 255 elements; 200 leaves headroom for the context keys.
export const PUBLISH_TRACKING_CHANGE_CAP = 200;

// Identifiers only. The publish event must never carry `oldValue`/`newValue` or any resolved label:
// those are the partner's own copy, and the global context attaches `user_email` to whatever ships.
export interface PublishImmersiveLayoutChange {
  kind: PublishDiffKind;
  fieldPath?: string;
  locale?: string;
  moduleId?: string;
  token?: string;
}

export interface PublishImmersiveLayoutData {
  changeCount: number;
  changeKinds: Partial<Record<PublishDiffKind, number>>;
  changes: PublishImmersiveLayoutChange[];
  planId: number;
  truncated: boolean;
}

// A revert is a state-only write, so there is nothing to describe beyond which plan it hit.
export interface RevertImmersiveLayoutData {
  planId: number;
}

export function buildPublishImmersiveLayoutData(changes: readonly WorkingChange[], planId: number): PublishImmersiveLayoutData {
  return {
    changeCount: changes.length,
    changeKinds: changes.reduce<Partial<Record<PublishDiffKind, number>>>(
      (counts, change) => ({ ...counts, [change.kind]: (counts[change.kind] ?? 0) + 1 }),
      {},
    ),
    changes: changes.slice(0, PUBLISH_TRACKING_CHANGE_CAP).map(toTrackedChange),
    planId,
    truncated: changes.length > PUBLISH_TRACKING_CHANGE_CAP,
  };
}

function toTrackedChange({ fieldPath, kind, locale, moduleId, token }: WorkingChange): PublishImmersiveLayoutChange {
  return {
    kind,
    ...(fieldPath === undefined ? {} : { fieldPath }),
    ...(locale === undefined ? {} : { locale }),
    ...(moduleId === undefined ? {} : { moduleId }),
    ...(token === undefined ? {} : { token }),
  };
}
