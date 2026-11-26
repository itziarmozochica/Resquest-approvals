/**
 * Expected api-gw shape for the `edit_history` field on IR / Approval responses
 * (top-level snake_case, matching this repo's API convention).
 *
 * ⚠️ The exact contract — especially the casing of `structured_changes` internals —
 * must be reconciled with the BE-111 backend. `parseEditHistory` is deliberately
 * tolerant (accepts camelCase too, drops unknown/partial shapes), so deviations
 * degrade gracefully rather than crash the UI.
 */
export interface EditHistoryEntryApiDto {
  at: string;
  actor_email?: string;
  actor_user_id?: string;
  summary: string;
  changes?: string[];
  structured_changes?: unknown;
  comment_edit?: EditHistoryCommentEditApiDto | null;
}

export interface EditHistoryCommentEditApiDto {
  item_id?: string;
  item_label?: string;
}
