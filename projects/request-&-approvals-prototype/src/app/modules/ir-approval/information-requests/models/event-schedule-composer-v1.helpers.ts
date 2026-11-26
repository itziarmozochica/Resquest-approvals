/**
 * Computation helpers for the V1 event-schedule composer (ported verbatim from the former tool).
 * Calendar/day resolution, session materialization, demand tiers, and catalog-grid row building.
 */
import {
  CatalogGridRow,
  defaultEventScheduleComposerState,
  ensureDefaultNamedDateRangeWhenEmpty,
  EventScheduleComposerStateV1,
  NamedDateRangeV1,
  normalizeTier,
  ProductRow,
  ScheduleDateOverrideV1,
  ScheduleDemandTier,
  SessionSlotV1,
  SessionWindow,
} from './event-schedule-composer-v1.model';
import { parseNamedDateRanges } from './event-schedule-composer-v1.parse';

const HM = /^\d{2}:\d{2}$/;

// ── Date math ───────────────────────────────────────────────────────────────

export function ymdLocalFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYmdLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dowKeyFromYmd(ymd: string): string {
  const d0 = parseYmdLocal(ymd);
  return d0 ? String(startOfDay(d0).getDay()) : '1';
}

export function ymdInInclusiveSpan(ymd: string, startYmd: string, endYmd: string): boolean {
  const s = startYmd.trim();
  const e = (endYmd.trim() || s).trim();
  if (!s) return false;
  const lo = s <= e ? s : e;
  const hi = s <= e ? e : s;
  return ymd >= lo && ymd <= hi;
}

export function eachDayInclusiveYmd(startYmd: string, endYmd: string): string[] {
  const s = parseYmdLocal(startYmd);
  const e = parseYmdLocal(endYmd);
  if (!s || !e) return [];
  const lo = s.getTime() <= e.getTime() ? s : e;
  const hi = s.getTime() <= e.getTime() ? e : s;
  const out: string[] = [];
  const cur = new Date(lo.getFullYear(), lo.getMonth(), lo.getDate());
  const endT = new Date(hi.getFullYear(), hi.getMonth(), hi.getDate()).getTime();
  while (cur.getTime() <= endT) {
    out.push(ymdLocalFromDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function addDaysYmd(ymd: string, deltaDays: number): string | null {
  const d = parseYmdLocal(ymd);
  if (!d) return null;
  return ymdLocalFromDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + deltaDays));
}

// ── Named-range spans ─────────────────────────────────────────────────────────

function normalizeNamedRangeSpanPair(startYmd: string, endYmd: string): { start: string; end: string } | null {
  const s = startYmd.trim();
  const e = endYmd.trim();
  if (!s || !e) return null;
  return s <= e ? { start: s, end: e } : { start: e, end: s };
}

export function namedRangeInclusiveSpans(nr: NamedDateRangeV1): { start: string; end: string }[] {
  const segSrc = nr.rangeSegments;
  if (Array.isArray(segSrc) && segSrc.length > 0) {
    const out: { start: string; end: string }[] = [];
    for (const seg of segSrc) {
      const n = normalizeNamedRangeSpanPair(String(seg?.start ?? ''), String(seg?.end ?? ''));
      if (n) out.push(n);
    }
    if (out.length > 0) return out;
  }
  const single = normalizeNamedRangeSpanPair(nr.rangeStart ?? '', nr.rangeEnd ?? '');
  return single ? [single] : [];
}

export function namedRangeCalendarEnvelope(nr: NamedDateRangeV1): { start: string; end: string } | null {
  const spans = namedRangeInclusiveSpans(nr);
  if (spans.length === 0) return null;
  let lo = spans[0].start;
  let hi = spans[0].end;
  for (const s of spans) {
    if (s.start < lo) lo = s.start;
    if (s.end > hi) hi = s.end;
  }
  return { start: lo, end: hi };
}

function ymdInNamedRangeSpanUnion(nr: NamedDateRangeV1, ymd: string): boolean {
  return namedRangeInclusiveSpans(nr).some(({ start, end }) => ymdInInclusiveSpan(ymd, start, end));
}

function collectOpenYmdsForSpan(nr: NamedDateRangeV1, span: { start: string; end: string }): string[] {
  const ex = new Set(nr.excludedDates.map(d => d.trim()).filter(Boolean));
  const out: string[] = [];
  for (const ymd of eachDayInclusiveYmd(span.start, span.end)) {
    if (ex.has(ymd)) continue;
    const d0 = parseYmdLocal(ymd);
    if (!d0) continue;
    const dowNum = startOfDay(d0).getDay();
    if (nr.onlyDows?.length && !nr.onlyDows.includes(dowNum)) continue;
    out.push(ymd);
  }
  return out;
}

export function collectOpenYmdsForNamedRange(nr: NamedDateRangeV1): string[] {
  const seen = new Set<string>();
  for (const span of namedRangeInclusiveSpans(nr)) {
    for (const ymd of collectOpenYmdsForSpan(nr, span)) seen.add(ymd);
  }
  return [...seen].sort();
}

/** First matching named band in stored order (overlaps: earlier entry wins). */
export function activeNamedRangeForYmd(composer: EventScheduleComposerStateV1, ymd: string): NamedDateRangeV1 | null {
  const bands = composer.namedDateRanges;
  if (!bands?.length) return null;
  const d0 = parseYmdLocal(ymd);
  if (!d0) return null;
  const dowNum = startOfDay(d0).getDay();
  for (const nr of bands) {
    if (!ymdInNamedRangeSpanUnion(nr, ymd)) continue;
    if (nr.excludedDates?.some(d => d.trim() === ymd)) continue;
    if (nr.onlyDows?.length && !nr.onlyDows.includes(dowNum)) continue;
    return nr;
  }
  return null;
}

/** Index into `namedDateRanges` for legend colours, or -1. */
export function namedRangeIndexForYmd(composer: EventScheduleComposerStateV1, ymd: string): number {
  const bands = composer.namedDateRanges;
  if (!bands?.length) return -1;
  const d0 = parseYmdLocal(ymd);
  if (!d0) return -1;
  const dowNum = startOfDay(d0).getDay();
  for (let i = 0; i < bands.length; i++) {
    const nr = bands[i];
    if (!ymdInNamedRangeSpanUnion(nr, ymd)) continue;
    if (nr.excludedDates?.some(d => d.trim() === ymd)) continue;
    if (nr.onlyDows?.length && !nr.onlyDows.includes(dowNum)) continue;
    return i;
  }
  return -1;
}

export function namedRangeWeekdayOpen(nr: NamedDateRangeV1, dow: number): boolean {
  const f = nr.onlyDows ?? [];
  return f.length === 0 || f.includes(dow);
}

/** Calendar + row generation: sorted unique YYYY-MM-DD open days across all named bands. */
export function effectiveIncludedYmds(composer: EventScheduleComposerStateV1): string[] {
  const set = new Set<string>();
  for (const nr of composer.namedDateRanges ?? []) {
    for (const ymd of collectOpenYmdsForNamedRange(nr)) set.add(ymd);
  }
  return [...set].sort();
}

// ── Overrides + scheduling base ────────────────────────────────────────────────

export function dateOverrideActiveOnYmd(composer: EventScheduleComposerStateV1, ymd: string): ScheduleDateOverrideV1 | null {
  for (const ov of composer.dateOverrides) {
    if (ymdInInclusiveSpan(ymd, ov.startDate, ov.endDate)) return ov;
  }
  return null;
}

function namedRangeForSchedulingBaseFromOverride(
  composer: EventScheduleComposerStateV1,
  ymd: string,
  activeOverride: ScheduleDateOverrideV1 | null,
): NamedDateRangeV1 | null {
  const pick = activeOverride?.baseNamedRangeId?.trim();
  if (pick) {
    const found = composer.namedDateRanges?.find(r => r.id === pick);
    if (found) return found;
  }
  return activeNamedRangeForYmd(composer, ymd);
}

// ── Ticket products per day ─────────────────────────────────────────────────────

/**
 * Product ids this band selected from the global catalog (`bandTicketTypesAnswer` v4
 * `{ selectedProductIds, v:4 }`). Ids are filtered to those still present in `globalProducts` (kept in
 * catalog order). Legacy/empty answers yield no selection. Pass an empty catalog to skip filtering.
 */
export function parseSelectedProductIds(answer: string | null | undefined, globalProducts: ProductRow[] = []): string[] {
  const raw = String(answer ?? '').trim();
  if (!raw) return [];
  let parsed: { selectedProductIds?: unknown } | null = null;
  try {
    parsed = JSON.parse(raw) as { selectedProductIds?: unknown };
  } catch {
    return [];
  }
  const ids = Array.isArray(parsed?.selectedProductIds) ? parsed.selectedProductIds.map(value => String(value)) : [];
  if (!globalProducts.length) return ids;
  const requested = new Set(ids);
  return globalProducts.map(product => product.id).filter(id => requested.has(id));
}

/** Serialize a band's product selection. Empty selection → '' so the band reads as "nothing selected". */
export function withSelectedProductIds(ids: string[]): string {
  return ids.length ? JSON.stringify({ selectedProductIds: ids, v: 4 }) : '';
}

/** Products that apply to a band: the global catalog narrowed to the band's selection (empty when none). */
export function ticketProductsForNamedRange(nr: NamedDateRangeV1 | null | undefined, globalFallback: ProductRow[]): ProductRow[] {
  const selected = new Set(parseSelectedProductIds(nr?.bandTicketTypesAnswer, globalFallback));
  if (!selected.size) return [];
  return globalFallback.filter(product => selected.has(product.id));
}

export function ticketProductsForComposerDay(
  composer: EventScheduleComposerStateV1,
  ymd: string,
  globalProducts: ProductRow[],
): ProductRow[] {
  return ticketProductsForNamedRange(activeNamedRangeForYmd(composer, ymd), globalProducts);
}

export function ymdIsOpenTicketingDay(composer: EventScheduleComposerStateV1, ymd: string): boolean {
  return activeNamedRangeForYmd(composer, ymd) != null;
}

// ── Times + sessions ────────────────────────────────────────────────────────────

function parseHmToMinutes(hm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function formatMinutesToHm(totalMin: number): string {
  const day = 24 * 60;
  const normalized = ((Math.floor(totalMin) % day) + day) % day;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function addMinutesHm(hm: string, deltaMin: number): string {
  const base = parseHmToMinutes(hm);
  return base === null ? '' : formatMinutesToHm(base + deltaMin);
}

/** Effective single-slot duration (minutes) for a day: the active band's `durationMin`. */
function durationForYmd(composer: EventScheduleComposerStateV1, ymd: string): number {
  const nr = namedRangeForSchedulingBaseFromOverride(composer, ymd, dateOverrideActiveOnYmd(composer, ymd));
  const d = nr?.durationMin;
  return Number.isFinite(d) && (d ?? 0) > 0 ? Math.floor(d as number) : 0;
}

/** Valid, time-sorted slots configured for the weekday of `ymd`. */
export function slotsForYmd(composer: EventScheduleComposerStateV1, ymd: string): SessionSlotV1[] {
  if (!ymdIsOpenTicketingDay(composer, ymd)) return [];
  const dow = dowKeyFromYmd(ymd);
  const nr = namedRangeForSchedulingBaseFromOverride(composer, ymd, dateOverrideActiveOnYmd(composer, ymd));
  const slots = nr?.dowSlots?.[dow];
  return (slots ?? [])
    .filter(s => HM.test(String(s.start ?? '')))
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function sessionWindowsForYmd(composer: EventScheduleComposerStateV1, ymd: string): SessionWindow[] {
  const duration = durationForYmd(composer, ymd);
  return slotsForYmd(composer, ymd).map(s => ({
    start: s.start,
    end: duration > 0 ? addMinutesHm(s.start, duration) : s.start,
    doorsOpen: s.start,
    tier: s.tier,
  }));
}

export function timesForYmd(
  composer: EventScheduleComposerStateV1,
  ymd: string,
): { doorsOpen: string; showStart: string; showEnd: string } {
  const windows = sessionWindowsForYmd(composer, ymd);
  if (!windows.length) return { doorsOpen: '', showStart: '', showEnd: '' };
  let doorsOpen = windows[0].start;
  let showStart = windows[0].start;
  let showEnd = windows[windows.length - 1].end;
  const spanOv = dateOverrideActiveOnYmd(composer, ymd);
  if (spanOv) {
    const dO = String(spanOv.doorsOpen ?? '').trim();
    const sS = String(spanOv.showStart ?? '').trim();
    const sE = String(spanOv.showEnd ?? '').trim();
    if (dO) doorsOpen = dO;
    if (sS) showStart = sS;
    if (sE) showEnd = sE;
  }
  return { doorsOpen, showStart, showEnd };
}

// ── Demand tiers + row building ──────────────────────────────────────────────────

/** Best-effort day-level demand per product: the tier of the first slot that sells it; 'Closed' if none. */
export function tiersForDay(ymd: string, composer: EventScheduleComposerStateV1, productIds: string[]): Record<string, ScheduleDemandTier> {
  const slots = slotsForYmd(composer, ymd);
  const override = dateOverrideActiveOnYmd(composer, ymd);
  const out: Record<string, ScheduleDemandTier> = {};
  for (const id of productIds) {
    const fromOv = override?.products[id];
    if (fromOv !== undefined && String(fromOv).length > 0) {
      out[id] = fromOv;
      continue;
    }
    const slot = slots.find(s => s.productIds.includes(id));
    out[id] = slot ? slot.tier || 'Standard' : 'Closed';
  }
  return out;
}

// ── Named-range completeness ─────────────────────────────────────────────────────

function namedRangeSpanRows(nr: NamedDateRangeV1): { start: string; end: string }[] {
  return Array.isArray(nr.rangeSegments) && nr.rangeSegments.length
    ? nr.rangeSegments
    : [{ end: nr.rangeEnd ?? '', start: nr.rangeStart ?? '' }];
}

function namedRangeHasInvalidExcludedRange(nr: NamedDateRangeV1, spans: { start: string; end: string }[]): boolean {
  const rows = nr.excludedRanges;
  if (Array.isArray(rows)) {
    return rows.some(row => {
      const start = String(row.start ?? '').trim();
      const end = String(row.end ?? '').trim();
      if (!!start !== !!end) return true;
      if (!start) return false;
      return !eachDayInclusiveYmd(start, end).every(date => spans.some(span => ymdInInclusiveSpan(date, span.start, span.end)));
    });
  }
  return (nr.excludedDates ?? []).some(date => !spans.some(span => ymdInInclusiveSpan(date, span.start, span.end)));
}

/** Identity step complete: a name, at least one full date period, no partial rows, valid excluded ranges. */
export function namedRangeIdentityComplete(nr: NamedDateRangeV1): boolean {
  if (!nr.name?.trim()) return false;
  const rows = namedRangeSpanRows(nr);
  if (!rows.some(row => String(row.start ?? '').trim() && String(row.end ?? '').trim())) return false;
  if (rows.some(row => !!String(row.start ?? '').trim() !== !!String(row.end ?? '').trim())) return false;
  return !namedRangeHasInvalidExcludedRange(nr, namedRangeInclusiveSpans(nr));
}

/** Tickets step complete: the global catalog has products and this band selected at least one of them. */
export function namedRangeTicketsComplete(nr: NamedDateRangeV1, globalProducts: ProductRow[]): boolean {
  if (globalProducts.length === 0) return false;
  return parseSelectedProductIds(nr.bandTicketTypesAnswer, globalProducts).length > 0;
}

/** Weekdays step complete: a band duration, at least one open weekday, each with ≥1 valid slot (start + ≥1 product). */
export function namedRangeWeekdaysComplete(nr: NamedDateRangeV1): boolean {
  if (!Number.isFinite(nr.durationMin) || (nr.durationMin ?? 0) <= 0) return false;
  const openDows = [1, 2, 3, 4, 5, 6, 0].filter(dow => namedRangeWeekdayOpen(nr, dow));
  if (!openDows.length) return false;
  return openDows.every(dow => {
    const slots = nr.dowSlots?.[String(dow)] ?? [];
    if (!slots.length) return false;
    return slots.every(s => HM.test(String(s.start ?? '')) && s.productIds.length > 0);
  });
}

/** A band is 100% configured when identity, tickets and weekdays/sessions are all complete (venue excluded — it is a sibling cross-question). */
export function namedRangeComplete(nr: NamedDateRangeV1, globalProducts: ProductRow[]): boolean {
  return namedRangeIdentityComplete(nr) && namedRangeTicketsComplete(nr, globalProducts) && namedRangeWeekdaysComplete(nr);
}

// ── Pricing display + day detail ─────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: 'A$',
  BRL: 'R$',
  CAD: 'CA$',
  CHF: 'CHF ',
  EUR: '€',
  GBP: '£',
  MXN: 'MX$',
  USD: '$',
};

export function currencySymbol(code: string): string {
  const c = String(code ?? '')
    .trim()
    .toUpperCase();
  return CURRENCY_SYMBOLS[c] ?? (c ? `${c} ` : '');
}

/** Raw configured price for a product at a demand tier: Peak/Valley use the matching subcategory, else the main price. */
export function priceForProductTier(product: ProductRow, tier: ScheduleDemandTier): string {
  const category = tier === 'Peak' ? 'peak' : tier === 'Valley' ? 'valley' : '';
  if (category) {
    const sub = (product.subcategories ?? []).find(
      s =>
        String(s.category ?? '')
          .trim()
          .toLowerCase() === category,
    );
    return String(sub?.pricing ?? '').trim();
  }
  return String(product.pricing ?? '').trim();
}

/** Numeric value of a configured price string, or null when blank/non-numeric (can't be compared). */
export function ticketPriceNumber(value: unknown): number | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Demand-tier price rule per product: peak may not be below the standard price, valley may not be above it (equal is allowed). */
export function productTierPriceViolation(product: ProductRow): { peak: boolean; valley: boolean } {
  const standard = ticketPriceNumber(product.pricing);
  const pricingFor = (category: string): unknown =>
    (product.subcategories ?? []).find(
      s =>
        String(s.category ?? '')
          .trim()
          .toLowerCase() === category,
    )?.pricing;
  const peak = ticketPriceNumber(pricingFor('peak'));
  const valley = ticketPriceNumber(pricingFor('valley'));
  return {
    peak: standard !== null && peak !== null && peak < standard,
    valley: standard !== null && valley !== null && valley > standard,
  };
}

/**
 * True when any product embedded in a band's ticket answer breaks the peak/valley price ordering.
 * Under the selection model (v4) bands store only selected ids (no embedded `products`), so this returns
 * false for them; Peak/Valley ordering is now validated once in the global Products catalog editor. Kept
 * for legacy (v3) band answers and backwards-compatible callers.
 */
export function namedRangeTicketTierViolation(nr: NamedDateRangeV1): boolean {
  const raw = String(nr.bandTicketTypesAnswer ?? '').trim();
  if (!raw) return false;
  let parsed: { products?: ProductRow[] } | null = null;
  try {
    parsed = JSON.parse(raw) as { products?: ProductRow[] };
  } catch {
    return false;
  }
  return (parsed?.products ?? []).some(product => {
    const violation = productTierPriceViolation(product);
    return violation.peak || violation.valley;
  });
}

export interface DayDetailProduct {
  name: string;
  tier: ScheduleDemandTier;
  price: string;
}

export interface DayDetail {
  ymd: string;
  bandName: string;
  currency: string;
  sessions: { start: string; end: string }[];
  products: DayDetailProduct[];
}

/** Resolves everything shown in the calendar day-detail modal for one day (day-level demand tier). */
export function buildDayDetail(
  composer: EventScheduleComposerStateV1,
  ymd: string,
  globalProducts: ProductRow[],
  currency = '',
): DayDetail {
  const band = activeNamedRangeForYmd(composer, ymd);
  const dayProducts = ticketProductsForComposerDay(composer, ymd, globalProducts);
  const tierMap = tiersForDay(
    ymd,
    composer,
    dayProducts.map(p => p.id),
  );
  const products: DayDetailProduct[] = dayProducts
    .filter(p => tierMap[p.id] !== 'Closed')
    .map(p => {
      const tier = (tierMap[p.id] || 'Standard') as ScheduleDemandTier;
      return { name: p.name, price: priceForProductTier(p, tier), tier };
    });
  return {
    bandName: band?.name?.trim() ?? '',
    currency,
    products,
    sessions: sessionWindowsForYmd(composer, ymd).map(s => ({ end: s.end, start: s.start })),
    ymd,
  };
}

export function composerCanAppendRows(composer: EventScheduleComposerStateV1): boolean {
  const included = effectiveIncludedYmds(composer);
  if (included.length === 0) return false;
  return included.some(ymd => slotsForYmd(composer, ymd).length > 0);
}

function scheduleRowContentSignature(row: CatalogGridRow): string {
  return JSON.stringify({
    doorsOpen: String(row.doorsOpen ?? ''),
    showStart: String(row.showStart ?? ''),
    showEnd: String(row.showEnd ?? ''),
    pricingTier: String(row.pricingTier ?? ''),
  });
}

/** One catalog-grid row for a single time slot on a single day (show window derived from the band duration). */
function buildCatalogRowForSlot(
  ymd: string,
  slot: SessionSlotV1,
  duration: number,
  rowColumnIds: { hasPricingTier: boolean },
): CatalogGridRow {
  const start = slot.start;
  const end = duration > 0 ? addMinutesHm(start, duration) : start;
  const row: CatalogGridRow = { startDate: ymd, endDate: ymd, doorsOpen: start, showStart: start, showEnd: end };
  if (rowColumnIds.hasPricingTier) row.pricingTier = slot.tier || 'Standard';
  return row;
}

export function buildScheduleRowsFromComposer(
  composer: EventScheduleComposerStateV1,
  rowColumnIds: { hasPricingTier: boolean },
): CatalogGridRow[] {
  const includedSorted = effectiveIncludedYmds(composer);
  if (!includedSorted.length || !composerCanAppendRows(composer)) return [];
  // Bucket per-slot rows by their (date-independent) content signature, keeping the dates each one covers.
  const bySignature = new Map<string, { row: CatalogGridRow; dates: Set<string> }>();
  for (const ymd of includedSorted) {
    const duration = durationForYmd(composer, ymd);
    for (const slot of slotsForYmd(composer, ymd)) {
      const row = buildCatalogRowForSlot(ymd, slot, duration, rowColumnIds);
      const sig = scheduleRowContentSignature(row);
      const entry = bySignature.get(sig);
      if (entry) entry.dates.add(ymd);
      else bySignature.set(sig, { dates: new Set([ymd]), row });
    }
  }
  // Within each bucket, merge consecutive calendar dates into startDate→endDate ranges.
  const merged: CatalogGridRow[] = [];
  for (const { row, dates } of bySignature.values()) {
    const sorted = [...dates].sort();
    let runStart = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i <= sorted.length; i++) {
      const cur = sorted[i];
      if (cur && addDaysYmd(prev, 1) === cur) {
        prev = cur;
        continue;
      }
      merged.push({ ...row, endDate: prev, startDate: runStart });
      if (cur) {
        runStart = cur;
        prev = cur;
      }
    }
  }
  merged.sort((a, b) => a.startDate.localeCompare(b.startDate) || String(a.showStart).localeCompare(String(b.showStart)));
  return merged;
}

// ── Public meta parse ────────────────────────────────

export function parseEventScheduleComposerMeta(raw: unknown): EventScheduleComposerStateV1 {
  if (!raw || typeof raw !== 'object') {
    return ensureDefaultNamedDateRangeWhenEmpty(defaultEventScheduleComposerState());
  }
  const o = raw as Record<string, unknown>;
  const vNum = typeof o['v'] === 'number' && Number.isFinite(o['v']) ? (o['v'] as number) : Number(o['v']);
  if (vNum !== 1) {
    return ensureDefaultNamedDateRangeWhenEmpty(defaultEventScheduleComposerState());
  }
  const dateOverrides: ScheduleDateOverrideV1[] = [];
  if (Array.isArray(o['dateOverrides'])) {
    for (const item of o['dateOverrides'] as unknown[]) {
      if (!item || typeof item !== 'object') continue;
      const it = item as Record<string, unknown>;
      const startDate = String(it['startDate'] ?? it['date'] ?? '').trim();
      const endDate = String(it['endDate'] ?? it['date'] ?? startDate).trim();
      const products: Record<string, ScheduleDemandTier> = {};
      if (it['products'] && typeof it['products'] === 'object' && !Array.isArray(it['products'])) {
        for (const [k, v] of Object.entries(it['products'] as Record<string, unknown>)) products[k] = normalizeTier(String(v ?? ''));
      }
      const slice: ScheduleDateOverrideV1 = { startDate: startDate || '', endDate: (endDate || startDate || '').trim(), products };
      const dO = String(it['doorsOpen'] ?? '').trim();
      const sS = String(it['showStart'] ?? '').trim();
      const sE = String(it['showEnd'] ?? '').trim();
      if (dO) slice.doorsOpen = dO;
      if (sS) slice.showStart = sS;
      if (sE) slice.showEnd = sE;
      const bn = String(it['baseNamedRangeId'] ?? '').trim();
      if (bn) slice.baseNamedRangeId = bn;
      dateOverrides.push(slice);
    }
  }
  const namedDateRanges = parseNamedDateRanges(o['namedDateRanges']);
  const base: EventScheduleComposerStateV1 = { v: 1, dateOverrides, namedDateRanges };
  return ensureDefaultNamedDateRangeWhenEmpty(base);
}
