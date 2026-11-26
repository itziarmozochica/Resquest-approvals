import type { PublishAction } from '../../models/store/immersive-content-plan-store.model';
import type { LayoutPersistIntent, PersistGate } from '../../utils/immersive-layout-persist-gate.util';
import {
  MESSAGE_KEYS,
  type PublishValidationCode,
  type PublishValidationError,
} from '../../utils/immersive-layout-publish-validation.util';

// The dialog names one more case than there are write intents: a publish reached from a clean
// draft is a promotion, not a fourth kind of write. Everything else is keyed by the intent itself,
// so a new write kind adds one row here instead of a branch in four places.
export type ConfirmDialogVariant = LayoutPersistIntent | 'promotion';

export interface DialogCopyKeys {
  subtitleKey: string;
  titleKey: string;
  // The public page reads the layout through a cache that is only ever written, never invalidated,
  // so a write appears when the entry expires rather than when it lands. Only the writes the public
  // page can see carry the note: a draft never reaches that cache, so saying it there is noise.
  cacheNoteKey?: string;
}

const cacheDelayNoteKey = 'planEdition.immersiveContentPlan.cacheDelayNote';

export const CONFIRM_LABEL_KEYS: Record<LayoutPersistIntent, string> = {
  publish: 'planEdition.immersiveContentPlan.publishCta',
  'revert-to-draft': 'planEdition.immersiveContentPlan.revertCta',
  'save-draft': 'planEdition.saveDraft',
};

// A revert offers no replication and never renders the checkbox, so its entry is never read.
export const OFFER_CHECKBOX_KEYS: Record<LayoutPersistIntent, string> = {
  publish: 'planEdition.immersiveContentPlan.replication.offerCheckbox',
  'revert-to-draft': 'planEdition.immersiveContentPlan.replication.offerCheckbox',
  'save-draft': 'planEdition.immersiveContentPlan.replication.offerCheckboxDraft',
};

export const DIALOG_COPY_KEYS: Record<ConfirmDialogVariant, DialogCopyKeys> = {
  promotion: {
    cacheNoteKey: cacheDelayNoteKey,
    subtitleKey: 'planEdition.immersiveContentPlan.publishPromotionDialogSubtitle',
    titleKey: 'planEdition.immersiveContentPlan.publishPromotionDialogTitle',
  },
  publish: {
    cacheNoteKey: cacheDelayNoteKey,
    subtitleKey: 'planEdition.immersiveContentPlan.publishDialogSubtitle',
    titleKey: 'planEdition.immersiveContentPlan.publishDialogTitle',
  },
  'revert-to-draft': {
    cacheNoteKey: cacheDelayNoteKey,
    subtitleKey: 'planEdition.immersiveContentPlan.revertDialogSubtitle',
    titleKey: 'planEdition.immersiveContentPlan.revertDialogTitle',
  },
  'save-draft': {
    subtitleKey: 'planEdition.immersiveContentPlan.saveDialogSubtitle',
    titleKey: 'planEdition.immersiveContentPlan.saveDialogTitle',
  },
};

// Only the failures get copy: a success is already visible in the bar's own status line. A
// `conflict` keeps the user's edits instead of re-fetching, so its copy is the only thing telling
// them the layout moved under them and a reload is what comes next.
export const PERSIST_ERROR_MESSAGE_KEYS: Partial<Record<NonNullable<PublishAction>, string>> = {
  conflict: 'planEdition.immersiveContentPlan.conflictDetected',
  publishError: 'planEdition.immersiveContentPlan.publishFailed',
  revertError: 'planEdition.immersiveContentPlan.revertFailed',
  saveError: 'planEdition.immersiveContentPlan.saveFailed',
};

// Reasons that mean the same thing whichever CTA reports them. Spread into both tables below so a
// shared reason can never gain copy on one button and stay mute on the other.
const SHARED_BLOCKED_REASON_KEYS: Partial<Record<PersistGate['reason'], string>> = {
  'in-progress': 'planEdition.immersiveContentPlan.persistInProgress',
  invalid: 'planEdition.immersiveContentPlan.publishBlockedInvalid',
  'not-immersive': 'planEdition.immersiveContentPlan.publishBlockedNotImmersive',
};

// Only the reasons a user can act on get copy. `already-published` cannot happen on the publish
// gate, and `forbidden`/`no-layout` hide the actions instead of explaining them.
export const PUBLISH_BLOCKED_REASON_KEYS: Partial<Record<PersistGate['reason'], string>> = {
  ...SHARED_BLOCKED_REASON_KEYS,
  'no-changes': 'planEdition.immersiveContentPlan.publishBlockedNoChanges',
};

// `already-draft` and `no-changes` cannot reach the revert CTA: the button only exists on a
// published layout, and a state-only write does not need changes.
export const REVERT_BLOCKED_REASON_KEYS: Partial<Record<PersistGate['reason'], string>> = {
  ...SHARED_BLOCKED_REASON_KEYS,
  'unsaved-changes': 'planEdition.immersiveContentPlan.revertBlockedUnsavedChanges',
};

export interface BlockedErrorFragment {
  count: number;
  key: string;
}

// Transport codes (`request_failed`, `server_rejected`) carry no copy of their own.
function hasMessageKey(code: PublishValidationCode): code is keyof typeof MESSAGE_KEYS {
  return code in MESSAGE_KEYS;
}

// "Fix 12 issues" told the user how many; this tells them what kind, in the order the validator
// reports them: one fragment per copy with its count — two codes that share a line (a url that
// does not load is an invalid url) add up instead of repeating it. The template renders each one
// as its own translated node, so no locale-bound text is ever joined in code.
export function summarizeBlockedErrors(errors: readonly PublishValidationError[]): BlockedErrorFragment[] {
  const counts = new Map<string, number>();
  for (const error of errors) {
    if (hasMessageKey(error.code)) {
      const key = MESSAGE_KEYS[error.code];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([key, count]) => ({ count, key }));
}
