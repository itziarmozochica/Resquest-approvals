import type { PlanviewLayout } from '../models/planview-layout-envelope.model';
import {
  buildUpsertPayload,
  type LayoutPersistStatus,
  type PublishValidationCode,
  type PublishValidationError,
  type PublishValidationResult,
} from './immersive-layout-publish-validation.util';

// `'draft'` as a status is ambiguous: it means both "keep my work in progress" and "take this
// off the public page". The gate reasons about the intent so the two never share a verdict.
export type LayoutPersistIntent = 'publish' | 'revert-to-draft' | 'save-draft';

export const INTENT_STATUS: Record<LayoutPersistIntent, LayoutPersistStatus> = {
  publish: 'published',
  'revert-to-draft': 'draft',
  'save-draft': 'draft',
};

export type PersistBlockReason =
  | 'already-draft'
  | 'already-published'
  | 'forbidden'
  | 'in-progress'
  | 'invalid'
  | 'no-changes'
  | 'no-layout'
  | 'not-immersive'
  | 'unsaved-changes';

export type PersistGate =
  | { reason: 'ready'; errors: readonly []; payload: PlanviewLayout }
  | { reason: PersistBlockReason; errors: readonly PublishValidationError[]; payload: null };

export interface PersistGateInput {
  canEdit: boolean;
  changeCount: number;
  committed: PlanviewLayout | null;
  isPersisting: boolean;
  validation: PublishValidationResult;
  working: PlanviewLayout | null;
}

// The same input once both documents are known to exist, so the revert branch needs no assertion.
interface ResolvedPersistGateInput extends PersistGateInput {
  committed: PlanviewLayout;
  working: PlanviewLayout;
}

// A draft is work in progress, so an untranslated locale must not stop a save — but a url the page
// cannot even render is never worth saving, whether it is structurally malformed (an invalid url or
// locale key, a document the editor cannot represent) or a media field that has not yet proven it
// loads, or has proven it does not.
const DRAFT_BLOCKING_CODES: readonly PublishValidationCode[] = [
  'document_family',
  'invalid_locale_key',
  'invalid_url',
  'media_broken',
  'media_checking',
];

/**
 * The single answer to "may this document be written, with this intent, right now?".
 *
 * First match wins, and every caller — the CTA, the confirm dialog and `persistLayout` — reads the
 * same verdict, so the button, the modal and the request can never disagree. The `ready` variant
 * carries the payload it validated, so the bytes that go over the wire are the bytes that passed.
 */
export function derivePersistGate(input: PersistGateInput, intent: LayoutPersistIntent): PersistGate {
  const { canEdit, changeCount, committed, isPersisting, validation, working } = input;

  if (working === null || committed === null) {
    return blocked('no-layout');
  }

  if (!canEdit) {
    return blocked('forbidden');
  }

  // Ordered after the two reasons that hide the actions and before every reason that only disables
  // them, so the bar names the wait instead of leaving a live-looking CTA. This verdict is what
  // disables the buttons; it is not what stops a second request — `exhaustMap` in `persistLayout`
  // does that, and it drops the second click before this function is ever consulted for it.
  if (isPersisting) {
    return blocked('in-progress');
  }

  if (intent === 'revert-to-draft') {
    return deriveRevertGate({ ...input, committed, working });
  }

  const status = INTENT_STATUS[intent];

  if (status === 'draft' && committed.status !== 'draft') {
    return blocked('already-published');
  }

  const familyBlock = familyErrorBlock(validation);
  if (familyBlock !== null) {
    return familyBlock;
  }

  if (status === 'draft') {
    const draftBlock = draftBlockingErrorBlock(validation);
    if (draftBlock !== null) {
      return draftBlock;
    }
  }

  // A clean draft may still be promoted to published; a clean published layout has nothing to
  // republish, and a clean draft save is a no-op.
  if (changeCount === 0 && (status === 'draft' || committed.status === 'published')) {
    return blocked('no-changes');
  }

  if (status === 'published' && !validation.valid) {
    return blocked('invalid', validation.errors);
  }

  return { errors: [], payload: buildUpsertPayload(working, status), reason: 'ready' };
}

/**
 * A revert is a state-only write: `changeCount === 0` is the normal case, not a blocker, and a
 * de-escalated document may still be missing translations — that is the next publish's problem.
 *
 * Its payload is the committed document with the status swapped, so the write carries no content
 * change of any kind — not even the locale-key canonicalisation every other intent applies.
 */
function deriveRevertGate({ changeCount, committed, validation }: ResolvedPersistGateInput): PersistGate {
  if (committed.status !== 'published') {
    return blocked('already-draft');
  }

  if (changeCount > 0) {
    return blocked('unsaved-changes');
  }

  return familyErrorBlock(validation) ?? draftBlockingErrorBlock(validation) ?? revertPayload(committed);
}

// A document the editor cannot represent at all. Checked before every other structural rule so the
// bar names the family problem rather than the symptoms it causes.
function familyErrorBlock(validation: PublishValidationResult): PersistGate | null {
  const familyErrors = validation.errors.filter(error => error.code === 'document_family');
  return familyErrors.length > 0 ? blocked('not-immersive', familyErrors) : null;
}

function draftBlockingErrorBlock(validation: PublishValidationResult): PersistGate | null {
  const draftBlockingErrors = validation.errors.filter(error => error.blocksDraft === true || DRAFT_BLOCKING_CODES.includes(error.code));
  return draftBlockingErrors.length > 0 ? blocked('invalid', draftBlockingErrors) : null;
}

// The committed bytes with the status swapped, never the gate's `working`: that one arrives
// already locale-normalised, and shipping it would rewrite `en-GB` into `en_GB` on a click the
// dialog presents as taking the layout off the public page. `changeCount === 0` in the caller is
// what makes `committed` a legitimate payload — `working` cannot have diverged from it.
function revertPayload(committed: PlanviewLayout): PersistGate {
  return { errors: [], payload: { ...committed, status: 'draft' }, reason: 'ready' };
}

function blocked(reason: PersistBlockReason, errors: readonly PublishValidationError[] = []): PersistGate {
  return { errors, payload: null, reason };
}
