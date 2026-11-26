import { EditHistoryStructuredPayload } from '@fz-original/app/shared/models/edit-history/edit-history.model';

import { ClippedCell, FlatRow } from '../models/edit-history-view.model';

const MAX_CELL = 2000;
const FOLD = 400;

function isScalar(v: unknown): boolean {
  return v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

function renderScalar(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return '—';
  return String(v);
}

/** Inline rendering; composite (object/array) values are parenthesised so nesting stays readable. */
function renderNested(v: unknown): string {
  return isScalar(v) ? renderScalar(v) : `(${renderValue(v)})`;
}

/** Recursively flatten any JSON value into a readable one-liner (no raw JSON, no depth cap). */
function renderValue(v: unknown): string {
  if (isScalar(v)) return renderScalar(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '(empty list)';
    if (v.every(isScalar)) return v.map(renderScalar).join(', ');
    return v.map(renderNested).join(' · ');
  }
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length === 0) return '(empty)';
  return keys.map(k => `${k}: ${renderNested(o[k])}`).join(' · ');
}

/**
 * Parses a Python-style literal (`str(dict)`/`str(list)`) into a JS value: single- or
 * double-quoted strings, `True`/`False`/`None`, numbers, dicts and lists. Top-level
 * comma-separated values (e.g. `{...}, {...}`) parse as a list. Throws on anything it
 * cannot fully consume, so non-literal text falls back to raw rendering.
 */
function parsePythonLiteral(input: string): unknown {
  let i = 0;
  const n = input.length;
  const skipWs = (): void => {
    while (i < n && /\s/.test(input[i]!)) i += 1;
  };

  const readString = (): string => {
    const quote = input[i++]!;
    let out = '';
    while (i < n) {
      const c = input[i++]!;
      if (c === '\\') {
        const e = input[i++];
        if (e === undefined) throw new Error('unterminated escape');
        out += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e;
      } else if (c === quote) {
        return out;
      } else {
        out += c;
      }
    }
    throw new Error('unterminated string');
  };

  const readNumber = (): number => {
    const start = i;
    if (input[i] === '+' || input[i] === '-') i += 1;
    while (i < n && /[0-9.eE+-]/.test(input[i]!)) i += 1;
    const raw = input.slice(start, i);
    const num = Number(raw);
    if (!raw || Number.isNaN(num)) throw new Error('invalid number');
    return num;
  };

  const readValue = (): unknown => {
    skipWs();
    const c = input[i];
    if (c === undefined) throw new Error('unexpected end');
    if (c === "'" || c === '"') return readString();
    if (c === '{') return readObject();
    if (c === '[') return readList();
    if (input.startsWith('True', i)) return (i += 4), true;
    if (input.startsWith('False', i)) return (i += 5), false;
    if (input.startsWith('None', i)) return (i += 4), null;
    if (c === '-' || c === '+' || (c >= '0' && c <= '9')) return readNumber();
    throw new Error(`unexpected token '${c}'`);
  };

  const readObject = (): Record<string, unknown> => {
    i += 1; // consume '{'
    const obj: Record<string, unknown> = {};
    skipWs();
    if (input[i] === '}') return (i += 1), obj;
    for (;;) {
      skipWs();
      if (input[i] !== "'" && input[i] !== '"') throw new Error('expected string key');
      const key = readString();
      skipWs();
      if (input[i++] !== ':') throw new Error("expected ':'");
      obj[key] = readValue();
      skipWs();
      const sep = input[i++];
      if (sep === '}') return obj;
      if (sep !== ',') throw new Error("expected ',' or '}'");
    }
  };

  const readList = (): unknown[] => {
    i += 1; // consume '['
    const arr: unknown[] = [];
    skipWs();
    if (input[i] === ']') return (i += 1), arr;
    for (;;) {
      arr.push(readValue());
      skipWs();
      const sep = input[i++];
      if (sep === ']') return arr;
      if (sep !== ',') throw new Error("expected ',' or ']'");
    }
  };

  const values: unknown[] = [readValue()];
  skipWs();
  while (i < n) {
    if (input[i] !== ',') throw new Error('trailing characters');
    i += 1;
    values.push(readValue());
    skipWs();
  }
  return values.length === 1 ? values[0] : values;
}

/** Plain-text rendering of a stored value (JSON / Python reprs are flattened to a readable one-liner). */
export function humanizeStoredValue(raw: string): string {
  const t = String(raw ?? '').trim();
  if (!t || t === '—') return '—';
  try {
    return renderValue(JSON.parse(t) as unknown);
  } catch {
    /* not JSON — try a Python-style literal below */
  }
  if (/^[[{]/.test(t)) {
    try {
      return renderValue(parsePythonLiteral(t));
    } catch {
      /* not a Python literal either — fall back to raw text */
    }
  }
  if (t.length > MAX_CELL) return `${t.slice(0, MAX_CELL - 1)}…`;
  return t;
}

/** Humanize then fold over-long values, exposing the full text for a tooltip. */
export function clipForCell(s: string, max = FOLD): ClippedCell {
  const h = humanizeStoredValue(s);
  if (h.length <= max) return { text: h };
  return { text: `${h.slice(0, max - 1)}…`, full: h };
}

/** Group rows by their first `·`-separated segment; single-segment rows fall under `generalLabel`. */
export function groupRowsByPrimarySection(rows: FlatRow[], generalLabel: string): { section: string; rows: FlatRow[] }[] {
  const order: string[] = [];
  const map = new Map<string, FlatRow[]>();
  for (const r of rows) {
    const parts = r.field
      .split(/\s*·\s*/)
      .map(s => s.trim())
      .filter(Boolean);
    const section = parts.length > 1 ? parts[0]! : generalLabel;
    const subField = parts.length > 1 ? parts.slice(1).join(' · ') : r.field;
    const row = { ...r, field: subField };
    if (!map.has(section)) {
      map.set(section, []);
      order.push(section);
    }
    map.get(section)!.push(row);
  }
  return order.map(section => ({ section, rows: map.get(section)! }));
}

/** Flatten the backend's structured diff into before/after rows (skips unchanged cells). */
export function flattenStructuredPayload(payload: EditHistoryStructuredPayload): FlatRow[] {
  const out: FlatRow[] = [];
  for (const q of payload.questions) {
    const reqP = q.requiredPrefix.trim();
    const req = reqP ? `${reqP} ` : '';
    const qLabel = q.label.trim() || 'Field';
    for (const b of q.blocks) {
      if (b.kind === 'fieldPairs') {
        for (const p of b.pairs) {
          if (p.before.trim() === p.after.trim()) continue;
          out.push({ field: `${req}${qLabel} · ${b.title} · ${p.label}`, before: p.before, after: p.after });
        }
      } else if (b.kind === 'rawFallback') {
        if (b.before.trim() === b.after.trim()) continue;
        out.push({ field: `${req}${qLabel} · ${b.title}`, before: b.before, after: b.after });
      } else {
        for (const row of b.rows) {
          for (const c of row.cells) {
            if (c.beforeDisplay.trim() === c.afterDisplay.trim()) continue;
            out.push({
              field: `${req}${qLabel} · ${b.title} · ${row.rowTitle} · ${c.columnLabel}`,
              before: c.beforeDisplay,
              after: c.afterDisplay,
            });
          }
        }
      }
    }
  }
  return out;
}

/** Drop identical values and legacy "answer changed" noise rows. */
export function flatRowIsRealChange(r: FlatRow): boolean {
  const noise = String(r.after ?? '')
    .trim()
    .toLowerCase();
  if (noise === 'answer changed') return false;
  const b = String(r.before ?? '').trim();
  const a = String(r.after ?? '').trim();
  if (b === '—' && a === '—') return false;
  return b !== a;
}
