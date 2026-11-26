import { FlatRow } from '../models/edit-history-view.model';

/**
 * Reconstructs before/after rows from the backend's legacy `changes[]` audit lines.
 *
 * Scalar / text / picklist / date answer edits, status changes and field add/remove
 * arrive only as `"… previous value": x` / `"… new value": y` line pairs (plus chunked
 * variants for very long values). This is a port of fever-operations-hub's
 * `flatRowsFromLegacyLines` and its pairing helpers.
 */

function rawHistoryCell(v: string): string {
  const s = String(v ?? '').trim();
  return s.length ? s : '—';
}

/** `head: value` — split on the first `: `. */
function splitAuditLine(line: string): { head: string; value: string } {
  const t = String(line);
  const idx = t.indexOf(': ');
  if (idx === -1) return { head: t.trim() || '—', value: '' };
  return { head: t.slice(0, idx).trim(), value: t.slice(idx + 2) };
}

function fieldKeyFromHead(head: string): string {
  return head
    .replace(/\s*·\s*previous value(\s+\[part\s+\d+\])?\s*$/i, '')
    .replace(/\s*·\s*new value(\s+\[part\s+\d+\])?\s*$/i, '')
    .replace(/\s*·\s*previous value\s*$/i, '')
    .replace(/\s*·\s*new value\s*$/i, '')
    .replace(/\s*·\s*helpText \(before\)\s*$/i, '')
    .replace(/\s*·\s*helpText \(after\)\s*$/i, '')
    .replace(/\s*·\s*options \(before\)\s*$/i, '')
    .replace(/\s*·\s*options \(after\)\s*$/i, '')
    .replace(/\s*·\s*catalog metadata \(before\)\s*$/i, '')
    .replace(/\s*·\s*catalog metadata \(after\)\s*$/i, '')
    .trim();
}

const INTRO_SUF = /\s*\(\d+\s*chars,\s*multiple parts follow\)\s*$/i;
const PART_SUF = /\s*\[part\s+\d+\]\s*$/i;

function normalizeValueHeadForCompare(head: string): string {
  return head.replace(PART_SUF, '').replace(INTRO_SUF, '').trim();
}

/** Reads a single value, joining `[part n]` chunk sequences into one string. */
function readOneChunkedValue(lines: string[], start: number): { value: string; end: number } {
  const t0 = String(lines[start] ?? '');
  if (!t0.trim()) return { value: '', end: start };
  const a = splitAuditLine(t0);
  if (a.head.length && INTRO_SUF.test(a.head)) {
    const base = a.head.replace(INTRO_SUF, '').trim();
    if (start + 1 >= lines.length) return { value: '', end: start };
    return readPartLinesSameBase(lines, start + 1, base);
  }
  if (PART_SUF.test(a.head)) {
    const base = a.head.replace(PART_SUF, '').trim();
    return readPartLinesSameBase(lines, start, base);
  }
  return { value: a.value, end: start };
}

function readPartLinesSameBase(lines: string[], start: number, base: string): { value: string; end: number } {
  const want = base.trim();
  if (start > lines.length - 1) return { value: '', end: start - 1 };
  const first = splitAuditLine(String(lines[start] ?? ''));
  const fBase = first.head.replace(PART_SUF, '').trim();
  if (fBase !== want) return { value: first.value, end: start };
  let v = first.value;
  let j = start;
  for (;;) {
    if (j + 1 > lines.length - 1) return { value: v, end: j };
    const p = splitAuditLine(String(lines[j + 1] ?? ''));
    const pBase = p.head.replace(PART_SUF, '').trim();
    if (pBase !== want || !PART_SUF.test(p.head)) return { value: v, end: j };
    v += p.value;
    j += 1;
  }
}

function isPrevNewPairKind(base: string, kind: 'prev' | 'new'): boolean {
  return kind === 'prev' ? /·\s*previous value\s*$/i.test(base) : /·\s*new value\s*$/i.test(base);
}

function answerFieldId(nBase: string, kind: 'prev' | 'new'): string {
  return nBase.replace(new RegExp(`·\\s*${kind === 'prev' ? 'previous' : 'new'} value\\s*$`, 'i'), '').trim();
}

/** Pairs a "previous value" / "new value" block (or a lone before-row if no match). */
function tryPairAnswer(lines: string[], i: number): (FlatRow & { end: number }) | null {
  const first = String(lines[i] ?? '');
  if (!first.trim()) return null;
  const a = splitAuditLine(first);
  const pBase = normalizeValueHeadForCompare(a.head);
  if (!isPrevNewPairKind(pBase, 'prev')) return null;
  const prevId = answerFieldId(pBase, 'prev');
  if (!prevId) return null;
  const b0 = readOneChunkedValue(lines, i);
  for (let j = b0.end + 1; j < lines.length; j += 1) {
    const s = String(lines[j] ?? '');
    if (!s.trim()) continue;
    const p = splitAuditLine(s);
    const nBase2 = normalizeValueHeadForCompare(p.head);
    if (!isPrevNewPairKind(nBase2, 'new')) continue;
    if (answerFieldId(nBase2, 'new') !== prevId) continue;
    const b1 = readOneChunkedValue(lines, j);
    return { field: prevId, before: rawHistoryCell(b0.value), after: rawHistoryCell(b1.value), end: b1.end };
  }
  return { field: prevId, before: rawHistoryCell(b0.value), after: '—', end: b0.end };
}

function helpOptCatKind(base: string): { kind: 'help' | 'options' | 'cat' } | null {
  if (/·\s*helpText/i.test(base)) return { kind: 'help' };
  if (/·\s*options/i.test(base)) return { kind: 'options' };
  if (/·\s*catalog metadata/i.test(base)) return { kind: 'cat' };
  return null;
}

function stripPairedBeforeAfter(h: string, ko: { kind: 'help' | 'options' | 'cat' }): { side: 'before' | 'after' | null; id: string } {
  if (ko.kind === 'help') {
    if (/·\s*helpText \(before\)\s*$/i.test(h)) return { side: 'before', id: h.replace(/·\s*helpText \(before\)\s*$/i, '').trim() };
    if (/·\s*helpText \(after\)\s*$/i.test(h)) return { side: 'after', id: h.replace(/·\s*helpText \(after\)\s*$/i, '').trim() };
  }
  if (ko.kind === 'options') {
    if (/·\s*options \(before\)\s*$/i.test(h)) return { side: 'before', id: h.replace(/·\s*options \(before\)\s*$/i, '').trim() };
    if (/·\s*options \(after\)\s*$/i.test(h)) return { side: 'after', id: h.replace(/·\s*options \(after\)\s*$/i, '').trim() };
  }
  if (ko.kind === 'cat') {
    if (/·\s*catalog metadata \(before\)\s*$/i.test(h))
      return { side: 'before', id: h.replace(/·\s*catalog metadata \(before\)\s*$/i, '').trim() };
    if (/·\s*catalog metadata \(after\)\s*$/i.test(h))
      return { side: 'after', id: h.replace(/·\s*catalog metadata \(after\)\s*$/i, '').trim() };
  }
  return { side: null, id: '' };
}

/** Pairs consecutive `helpText`/`options`/`catalog metadata` (before)/(after) blocks. */
function tryPairMetaBeforeAfter(lines: string[], i: number): { row: FlatRow | null; end: number } {
  const t0 = String(lines[i] ?? '');
  if (!t0.trim()) return { row: null, end: i };
  const a = splitAuditLine(t0);
  const n0 = normalizeValueHeadForCompare(a.head);
  const k = helpOptCatKind(n0);
  if (!k) return { row: null, end: i - 1 };
  const s0 = stripPairedBeforeAfter(n0, k);
  if (s0.side !== 'before' || !s0.id) return { row: null, end: i - 1 };
  const b0 = readOneChunkedValue(lines, i);
  const field = `${s0.id} · ${k.kind === 'cat' ? 'catalog' : k.kind === 'options' ? 'options' : 'helpText'}`;

  if (b0.end + 1 >= lines.length) {
    return { row: { field, before: rawHistoryCell(b0.value), after: '—' }, end: b0.end };
  }

  const p1 = splitAuditLine(String(lines[b0.end + 1] ?? ''));
  const n1 = normalizeValueHeadForCompare(p1.head);
  if (helpOptCatKind(n1)?.kind !== k.kind) {
    return { row: { field, before: rawHistoryCell(b0.value), after: '—' }, end: b0.end };
  }
  const s1 = stripPairedBeforeAfter(n1, k);
  if (s1.side !== 'after' || s1.id !== s0.id) {
    return { row: { field, before: rawHistoryCell(b0.value), after: '—' }, end: b0.end };
  }

  const aBlock = readOneChunkedValue(lines, b0.end + 1);
  return { row: { field, before: rawHistoryCell(b0.value), after: rawHistoryCell(aBlock.value) }, end: aBlock.end };
}

/** Reconstruct before/after rows from raw audit `changes[]` lines. */
export function flatRowsFromLegacyLines(lines: string[]): FlatRow[] {
  const out: FlatRow[] = [];
  let i = 0;
  const n = lines.length;
  while (i < n) {
    const iBefore = i;
    const t = String(lines[i] ?? '');
    if (!t.trim()) {
      i += 1;
      continue;
    }

    const meta = tryPairMetaBeforeAfter(lines, i);
    if (meta.row) {
      out.push(meta.row);
      i = meta.end + 1;
      if (i <= iBefore) i = iBefore + 1;
      continue;
    }

    const p = tryPairAnswer(lines, i);
    if (p) {
      const { end, ...row } = p;
      out.push(row);
      i = end + 1;
      if (i <= iBefore) i = iBefore + 1;
      continue;
    }

    const a = splitAuditLine(t);
    const nBase = normalizeValueHeadForCompare(a.head);
    // Orphaned "new value" (no previous) — show as a single new column.
    if (isPrevNewPairKind(nBase, 'new')) {
      const b1 = readOneChunkedValue(lines, i);
      out.push({ field: fieldKeyFromHead(nBase) || a.head, before: '—', after: rawHistoryCell(b1.value) });
      i = b1.end + 1;
      if (i <= iBefore) i = iBefore + 1;
      continue;
    }
    if (/·\s*helpText|·\s*options|·\s*catalog metadata/i.test(a.head)) {
      const b0 = readOneChunkedValue(lines, i);
      out.push({ field: a.head || nBase, before: '—', after: rawHistoryCell(b0.value) });
      i = b0.end + 1;
      if (i <= iBefore) i = iBefore + 1;
      continue;
    }
    const b0 = readOneChunkedValue(lines, i);
    out.push({ field: nBase || a.head || 'Change', before: '—', after: rawHistoryCell(b0.value) });
    i = b0.end + 1;
    if (i <= iBefore) i = iBefore + 1;
  }
  return out;
}
