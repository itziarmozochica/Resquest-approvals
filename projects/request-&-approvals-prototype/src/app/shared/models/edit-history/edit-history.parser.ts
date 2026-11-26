import {
  EditHistoryActivityAsset,
  EditHistoryActivityChange,
  EditHistoryCellDiff,
  EditHistoryCommentEdit,
  EditHistoryFieldPair,
  EditHistoryItemChange,
  EditHistoryQuestionBlock,
  EditHistoryQuestionBundle,
  EditHistoryRowDiff,
  EditHistoryStructuredPayload,
  EntityEditHistoryEntry,
} from './edit-history.model';

const MAX_LINE_LEN = 8000;
const MAX_PARSE_QUESTIONS = 80;
const MAX_PARSE_BLOCKS = 40;
const MAX_PARSE_ROWS = 80;
const MAX_PARSE_CELLS = 60;
const MAX_PARSE_PAIRS = 80;

function clipLine(value: string, maxLen = MAX_LINE_LEN): string {
  const t = value.replace(/\s+/g, ' ').trim();
  return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseActivityAsset(raw: unknown): EditHistoryActivityAsset | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const id = asString(o['id']);
  if (!id) return undefined;
  return { id, name: clipLine(asString(o['name']) ?? id) };
}

function parseCommentEdit(raw: unknown): EditHistoryCommentEdit | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const itemId = asString(o['itemId']) ?? asString(o['item_id']) ?? '';
  const itemLabel = (asString(o['itemLabel']) ?? asString(o['item_label']) ?? '').trim() || itemId;
  if (!itemLabel) return undefined;
  return { itemId, itemLabel: clipLine(itemLabel) };
}

/** Restore the structured payload from API JSON (tolerant of partial / old shapes). */
export function parseStructuredChanges(raw: unknown): EditHistoryStructuredPayload | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const questionsRaw = (raw as { questions?: unknown }).questions;
  if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) return undefined;
  const questions: EditHistoryQuestionBundle[] = [];

  for (const qr of questionsRaw.slice(0, MAX_PARSE_QUESTIONS)) {
    if (!qr || typeof qr !== 'object') continue;
    const label = String((qr as { label?: unknown }).label ?? '').trim();
    const requiredPrefix = String((qr as { requiredPrefix?: unknown }).requiredPrefix ?? '');
    const blocksRaw = (qr as { blocks?: unknown }).blocks;
    if (!label || !Array.isArray(blocksRaw)) continue;
    const blocks: EditHistoryQuestionBlock[] = [];

    for (const br of blocksRaw.slice(0, MAX_PARSE_BLOCKS)) {
      if (!br || typeof br !== 'object') continue;
      const kind = String((br as { kind?: unknown }).kind ?? '');
      if (kind === 'table') {
        const title = String((br as { title?: unknown }).title ?? 'Table').trim() || 'Table';
        const rowsRaw = (br as { rows?: unknown }).rows;
        if (!Array.isArray(rowsRaw)) continue;
        const rows: EditHistoryRowDiff[] = [];
        for (const rr of rowsRaw.slice(0, MAX_PARSE_ROWS)) {
          if (!rr || typeof rr !== 'object') continue;
          const rowTitle = String((rr as { rowTitle?: unknown }).rowTitle ?? '').trim() || 'Row';
          const cellsRaw = (rr as { cells?: unknown }).cells;
          if (!Array.isArray(cellsRaw)) continue;
          const cells: EditHistoryCellDiff[] = [];
          for (const cr of cellsRaw.slice(0, MAX_PARSE_CELLS)) {
            if (!cr || typeof cr !== 'object') continue;
            const columnLabel = String((cr as { columnLabel?: unknown }).columnLabel ?? '').trim() || 'Column';
            const beforeDisplay = String((cr as { beforeDisplay?: unknown }).beforeDisplay ?? '—');
            const afterDisplay = String((cr as { afterDisplay?: unknown }).afterDisplay ?? '—');
            cells.push({ columnLabel, beforeDisplay, afterDisplay });
          }
          if (cells.length) rows.push({ rowTitle, cells });
        }
        if (rows.length) blocks.push({ kind: 'table', title, rows });
      } else if (kind === 'fieldPairs') {
        const title = String((br as { title?: unknown }).title ?? 'Fields').trim() || 'Fields';
        const pairsRaw = (br as { pairs?: unknown }).pairs;
        if (!Array.isArray(pairsRaw)) continue;
        const pairs: EditHistoryFieldPair[] = [];
        for (const pr of pairsRaw.slice(0, MAX_PARSE_PAIRS)) {
          if (!pr || typeof pr !== 'object') continue;
          pairs.push({
            label: String((pr as { label?: unknown }).label ?? '').trim() || 'Field',
            before: String((pr as { before?: unknown }).before ?? '—'),
            after: String((pr as { after?: unknown }).after ?? '—'),
          });
        }
        if (pairs.length) blocks.push({ kind: 'fieldPairs', title, pairs });
      } else if (kind === 'rawFallback') {
        const title = String((br as { title?: unknown }).title ?? '').trim() || 'Values';
        const before = String((br as { before?: unknown }).before ?? '');
        const after = String((br as { after?: unknown }).after ?? '');
        blocks.push({ kind: 'rawFallback', title, before, after });
      }
    }
    if (blocks.length) questions.push({ label, requiredPrefix, blocks });
  }
  return questions.length ? { questions } : undefined;
}

/** Per-item status transitions (item reviews), tolerant of camelCase / snake_case keys. */
function parseItemChanges(raw: unknown): EditHistoryItemChange[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: EditHistoryItemChange[] = [];
  for (const c of raw.slice(0, MAX_PARSE_ROWS)) {
    if (!c || typeof c !== 'object') continue;
    const o = c as Record<string, unknown>;
    const label = asString(o['label']);
    const fromStatus = asString(o['fromStatus']) ?? asString(o['from_status']);
    const toStatus = asString(o['toStatus']) ?? asString(o['to_status']);
    if (!label || fromStatus === undefined || toStatus === undefined) continue;
    out.push({ label: clipLine(label), fromStatus, toStatus });
  }
  return out.length ? out : undefined;
}

function parseActivityChanges(raw: unknown): EditHistoryActivityChange[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: EditHistoryActivityChange[] = [];
  for (const c of raw.slice(-MAX_PARSE_ROWS)) {
    if (!c || typeof c !== 'object') continue;
    const o = c as Record<string, unknown>;
    const decision = asString(o['decision']);
    const asset = parseActivityAsset(o['asset']);
    if (!decision || !asset) continue;
    const at = asString(o['at']);
    out.push({ decision, asset, ...(at ? { at } : {}) });
  }
  return out.length ? out : undefined;
}

/**
 * Validate & normalise the api-gw `edit_history` payload. No diffing — the backend
 * owns that. Tolerant of both camelCase and snake_case top-level keys.
 */
export function parseEditHistory(raw: unknown): EntityEditHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: EntityEditHistoryEntry[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const at = asString(o['at']);
    const summary = asString(o['summary']);
    if (at === undefined || summary === undefined) continue;
    const rawChanges = o['changes'];
    const changes = Array.isArray(rawChanges)
      ? rawChanges.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map(c => clipLine(c))
      : undefined;
    const structuredChanges = parseStructuredChanges(o['structuredChanges'] ?? o['structured_changes']);
    const itemChanges = parseItemChanges(o['itemChanges'] ?? o['item_changes']);
    const activityChanges = parseActivityChanges(o['activityChanges'] ?? o['activity_changes']);
    const commentEdit = parseCommentEdit(o['commentEdit'] ?? o['comment_edit']);
    out.push({
      at,
      summary: clipLine(summary),
      actorEmail: asString(o['actorEmail']) ?? asString(o['actor_email']),
      actorUserId: asString(o['actorUserId']) ?? asString(o['actor_user_id']),
      ...(changes?.length ? { changes } : {}),
      ...(structuredChanges ? { structuredChanges } : {}),
      ...(itemChanges ? { itemChanges } : {}),
      ...(activityChanges ? { activityChanges } : {}),
      ...(commentEdit ? { commentEdit } : {}),
    });
  }
  return out;
}
