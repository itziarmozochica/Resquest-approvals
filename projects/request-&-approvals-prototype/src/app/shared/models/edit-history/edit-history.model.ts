/**
 * Domain types for the entity edit-history (audit) feature.
 *
 * The backend (api-gw) computes the before/after diff on every IR / Approval save
 * and returns it; this app only validates, maps and displays it. These shapes mirror
 * fever-operations-hub's `EntityEditHistoryEntry` so a single parser handles both.
 */

/** One cell change inside a logical row (table / FAQ pair / venue field). */
export interface EditHistoryCellDiff {
  columnLabel: string;
  beforeDisplay: string;
  afterDisplay: string;
}

export interface EditHistoryRowDiff {
  rowTitle: string;
  cells: EditHistoryCellDiff[];
}

export interface EditHistoryFieldPair {
  label: string;
  before: string;
  after: string;
}

export type EditHistoryQuestionBlock =
  | { kind: 'table'; title: string; rows: EditHistoryRowDiff[] }
  | { kind: 'fieldPairs'; title: string; pairs: EditHistoryFieldPair[] }
  | { kind: 'rawFallback'; title: string; before: string; after: string };

/** Structured diff for one question's answer (and related table metadata). */
export interface EditHistoryQuestionBundle {
  label: string;
  requiredPrefix: string;
  blocks: EditHistoryQuestionBlock[];
}

export interface EditHistoryStructuredPayload {
  questions: EditHistoryQuestionBundle[];
}

/** A single reviewed item's status transition within an entry (approve/reject reviews). */
export interface EditHistoryItemChange {
  label: string;
  fromStatus: string;
  toStatus: string;
}

export interface EditHistoryActivityAsset {
  id: string;
  name: string;
}

export interface EditHistoryActivityChange {
  decision: string;
  asset: EditHistoryActivityAsset;
  at?: string;
}

export interface EditHistoryCommentEdit {
  itemId: string;
  itemLabel: string;
}

/** One audit entry: who / when / summary, plus optional detailed diffs. */
export interface EntityEditHistoryEntry {
  at: string;
  actorEmail?: string;
  actorUserId?: string;
  summary: string;
  /** Line-by-line audit (scalar/text answers, status, field add/remove). */
  changes?: string[];
  /** Nested diff for composite answers / alerts (preferred over `changes` when present). */
  structuredChanges?: EditHistoryStructuredPayload;
  /** Per-item status transitions (item reviews) — rendered as their own rows when present. */
  itemChanges?: EditHistoryItemChange[];
  activityChanges?: EditHistoryActivityChange[];
  commentEdit?: EditHistoryCommentEdit;
}
