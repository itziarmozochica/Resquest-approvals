/**
 * Catalog-grid answer persistence (ported from the former tool's composite-answers `v2` bundle).
 * The schedule grid stores either a legacy row-only array, or a `{ v: 2, rows, meta }` bundle where
 * `meta.eventScheduleComposer` holds the composer state. Backends treat the answer opaquely, so the
 * round-trip must reproduce this shape exactly. This covers the row-only-columns case used by the
 * event-schedule grid; header columns are handled when full column specs are wired in a later phase.
 */
import { EVENT_SCHEDULE_COMPOSER_META_KEY } from './event-schedule-composer-v1.model';

export { EVENT_SCHEDULE_COMPOSER_META_KEY };

export type CatalogGridRow = Record<string, string>;

export interface ParsedCatalogGridBundle {
  rows: CatalogGridRow[];
  meta: Record<string, unknown>;
}

interface CatalogGridStoredV2 {
  v: 2;
  rows: CatalogGridRow[];
  meta?: Record<string, unknown>;
}

function parseJson(answer: unknown): unknown {
  if (typeof answer !== 'string') return answer ?? null;
  const trimmed = answer.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function flattenRow(row: unknown): CatalogGridRow | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const flat: CatalogGridRow = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) flat[k] = String(v ?? '');
  return flat;
}

/** Parse a catalog-grid answer (legacy row-only array, or a `{ v:2, rows, meta }` bundle). */
export function parseCatalogGridBundle(answer: unknown): ParsedCatalogGridBundle | null {
  const parsed = parseJson(answer);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed as { v?: number }).v === 2) {
    const st = parsed as CatalogGridStoredV2;
    const rows: CatalogGridRow[] = [];
    if (Array.isArray(st.rows)) {
      for (const row of st.rows) {
        const flat = flattenRow(row);
        if (flat) rows.push(flat);
      }
    }
    const m = st.meta;
    const meta = m && typeof m === 'object' && !Array.isArray(m) ? { ...(m as Record<string, unknown>) } : {};
    return { rows, meta };
  }
  if (!Array.isArray(parsed)) return null;
  const rows: CatalogGridRow[] = [];
  for (const row of parsed) {
    const flat = flattenRow(row);
    if (flat) rows.push(flat);
  }
  return { rows, meta: {} };
}

/** Serialize rows (+ optional meta) — a `{v:2}` bundle when meta is present, else a plain rows array. */
export function serializeCatalogGridBundle(rows: CatalogGridRow[], meta?: Record<string, unknown> | null): string {
  const metaClean = meta && typeof meta === 'object' && Object.keys(meta).length > 0 ? meta : undefined;
  if (metaClean) {
    const payload: CatalogGridStoredV2 = { v: 2, rows, meta: metaClean };
    return JSON.stringify(payload);
  }
  return JSON.stringify(rows);
}

/** Merge a meta patch onto an existing catalog-grid answer, preserving its rows. */
export function mergeCatalogGridBundleMeta(answerJson: unknown, metaPatch: Record<string, unknown>): string {
  const b = parseCatalogGridBundle(answerJson);
  const rows = b?.rows ?? [];
  const meta = { ...(b?.meta ?? {}), ...metaPatch };
  return serializeCatalogGridBundle(rows, meta);
}
