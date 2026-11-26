import { TableRow } from '../components/ir-table-repeater-answer/ir-table-repeater-answer.component';

/** Demand band for a product on a given day. Empty string means "unset". */
export type DemandTier = 'Peak' | 'Standard' | 'Closed' | '';

/** A sellable product the composer assigns demand tiers to (sourced from the ticket-types answer). */
export interface ScheduleProduct {
  id: string;
  name: string;
  capacity?: string;
  pricing?: string;
  taxName?: string;
  taxPercent?: string;
  subcategories?: {
    capacity?: string;
    category?: string;
    id: string;
    name: string;
    pricing?: string;
    taxName?: string;
    taxPercent?: string;
  }[];
}

/** Optional per-weekday time overrides; blank fields fall back to the global times. */
export interface DowTimeSlice {
  doorsOpen?: string;
  showStart?: string;
  showEnd?: string;
}

/**
 * Serializable composer state (v1). Weekday keys are JS day-of-week as strings: '0' (Sun) .. '6' (Sat).
 * Mirrors the core of the ops-hub EventScheduleComposerState (range + global/per-weekday times + per-weekday
 * per-product demand). Named ranges, recurring sessions and date overrides are intentionally out of v1.
 */
export interface EventScheduleComposerState {
  rangeStart: string;
  rangeEnd: string;
  excludedDates: string[];
  doorsOpen: string;
  showStart: string;
  showEnd: string;
  dowTimes: Record<string, DowTimeSlice>;
  dowTiers: Record<string, Record<string, DemandTier>>;
  /** Active product ids per weekday. Empty/missing list = all products active that day. */
  dowProductIds: Record<string, string[]>;
}

export interface ScheduleRowColumns {
  hasPricingTier: boolean;
  hasDemandByProduct: boolean;
}

const MS_PER_DAY = 86_400_000;

function parseMaybeJsonAnswer(answer: unknown): unknown {
  if (typeof answer !== 'string') return answer;
  try {
    return JSON.parse(answer);
  } catch {
    return answer;
  }
}

function normalizeProductSubcategories(raw: unknown, productId: string): ScheduleProduct['subcategories'] {
  if (!Array.isArray(raw)) return undefined;
  const subcategories = raw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const subcategory = entry as Record<string, unknown>;
      const id = String(subcategory['id'] ?? `${productId}-sub-${index}`).trim();
      const name = String(subcategory['name'] ?? subcategory['category'] ?? '').trim();
      const category =
        String(subcategory['category'] ?? '')
          .trim()
          .toLowerCase() || undefined;
      return {
        capacity: String(subcategory['capacity'] ?? '').trim() || undefined,
        category,
        id: id || `${productId}-sub-${index}`,
        name: name || id || `${productId} ${index + 1}`,
        pricing: String(subcategory['pricing'] ?? '').trim() || undefined,
        taxName: String(subcategory['taxName'] ?? '').trim() || undefined,
        taxPercent: String(subcategory['taxPercent'] ?? '').trim() || undefined,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  return subcategories.length ? subcategories : undefined;
}

function normalizeProductRow(row: unknown, index: number, nameColumn: string): ScheduleProduct | null {
  if (!row || typeof row !== 'object') return null;
  const record = row as Record<string, unknown>;
  const rawName = record[nameColumn] ?? record['name'];
  const name = typeof rawName === 'string' ? rawName.trim() : rawName != null ? String(rawName).trim() : '';
  if (!name) return null;
  const rawId = record['id'];
  const id = typeof rawId === 'string' && rawId.trim() ? rawId.trim() : `p-${index}`;
  const capacity = String(record['capacity'] ?? '').trim() || undefined;
  const pricing = String(record['pricing'] ?? '').trim() || undefined;
  const taxName = String(record['taxName'] ?? '').trim() || undefined;
  const taxPercent = String(record['taxPercent'] ?? '').trim() || undefined;
  const subcategories = normalizeProductSubcategories(record['subcategories'], id);
  return {
    id,
    name,
    ...(capacity ? { capacity } : {}),
    ...(pricing ? { pricing } : {}),
    ...(taxName ? { taxName } : {}),
    ...(taxPercent ? { taxPercent } : {}),
    ...(subcategories ? { subcategories } : {}),
  };
}

/**
 * Derive sellable products from sibling ticket-types answers. Supports the table-repeater array used by the
 * legacy composer and the serialized { products: [...] } payload used by the schedule stepper.
 */
export function extractProducts(answer: unknown, nameColumn = 'ticketType'): ScheduleProduct[] {
  const parsed = parseMaybeJsonAnswer(answer);
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? ((parsed as Record<string, unknown>)['products'] ?? (parsed as Record<string, unknown>)['rows'])
      : null;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row, index) => normalizeProductRow(row, index, nameColumn))
    .filter((product): product is ScheduleProduct => product !== null);
}

export function emptyComposerState(): EventScheduleComposerState {
  return {
    rangeStart: '',
    rangeEnd: '',
    excludedDates: [],
    doorsOpen: '',
    showStart: '',
    showEnd: '',
    dowTimes: {},
    dowTiers: {},
    dowProductIds: {},
  };
}

function parseYmd(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatYmd(utcMs: number): string {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** JS day-of-week (0 Sun .. 6 Sat) for a YYYY-MM-DD string. */
export function dowForYmd(ymd: string): number {
  const ms = parseYmd(ymd);
  return ms === null ? 0 : new Date(ms).getUTCDay();
}

/** Inclusive list of YYYY-MM-DD strings between start and end (caller guarantees order). */
export function eachDayInclusive(start: string, end: string): string[] {
  const a = parseYmd(start);
  const b = parseYmd(end);
  if (a === null || b === null || b < a) return [];
  const out: string[] = [];
  for (let ms = a; ms <= b; ms += MS_PER_DAY) {
    out.push(formatYmd(ms));
  }
  return out;
}

/** Days in the range minus excluded dates, sorted ascending. */
export function effectiveIncludedYmds(state: EventScheduleComposerState): string[] {
  if (!state.rangeStart || !state.rangeEnd) return [];
  const excluded = new Set(state.excludedDates ?? []);
  return eachDayInclusive(state.rangeStart, state.rangeEnd).filter(ymd => !excluded.has(ymd));
}

function productActiveOnDow(state: EventScheduleComposerState, dow: number, productId: string): boolean {
  const ids = state.dowProductIds?.[String(dow)];
  if (!ids || ids.length === 0) return true;
  return ids.includes(productId);
}

/** Resolve the demand tier for every product on a day (Closed when the product is inactive that weekday). */
export function tiersForDay(ymd: string, state: EventScheduleComposerState, products: ScheduleProduct[]): Record<string, DemandTier> {
  const dow = dowForYmd(ymd);
  const base = state.dowTiers?.[String(dow)] ?? {};
  const out: Record<string, DemandTier> = {};
  for (const product of products) {
    if (!productActiveOnDow(state, dow, product.id)) {
      out[product.id] = 'Closed';
    } else {
      out[product.id] = base[product.id] || 'Standard';
    }
  }
  return out;
}

/** Collapse per-product tiers into one column value: a single shared tier, or "Mixed". */
export function aggregatePricingTier(tiers: Record<string, DemandTier>): string {
  const uniq = new Set(Object.values(tiers).filter(t => t !== '' && t !== 'Closed'));
  if (uniq.size === 0) return 'Standard';
  if (uniq.size === 1) return [...uniq][0];
  return 'Mixed';
}

function timesForDay(state: EventScheduleComposerState, ymd: string): { doorsOpen: string; showStart: string; showEnd: string } {
  const slice = state.dowTimes?.[String(dowForYmd(ymd))] ?? {};
  return {
    doorsOpen: slice.doorsOpen || state.doorsOpen,
    showStart: slice.showStart || state.showStart,
    showEnd: slice.showEnd || state.showEnd,
  };
}

function buildDayRow(ymd: string, state: EventScheduleComposerState, products: ScheduleProduct[], columns: ScheduleRowColumns): TableRow {
  const tiers = tiersForDay(ymd, state, products);
  const times = timesForDay(state, ymd);
  const row: TableRow = {
    startDate: ymd,
    endDate: ymd,
    doorsOpen: times.doorsOpen,
    showStart: times.showStart,
    showEnd: times.showEnd,
  };

  const applicable = products.filter(p => tiers[p.id] !== 'Closed');

  if (columns.hasPricingTier) {
    const applicableTiers: Record<string, DemandTier> = {};
    for (const p of applicable) applicableTiers[p.id] = tiers[p.id];
    row['pricingTier'] = applicable.length === 0 ? 'Closed' : aggregatePricingTier(applicableTiers);
  }

  if (columns.hasDemandByProduct) {
    const byName: Record<string, DemandTier> = {};
    for (const p of [...applicable].sort((x, y) => x.name.localeCompare(y.name))) {
      byName[p.name] = tiers[p.id];
    }
    row['demandByProduct'] = JSON.stringify(byName);
  }

  return row;
}

function rowSignature(row: TableRow): string {
  return JSON.stringify({
    doorsOpen: row['doorsOpen'],
    showStart: row['showStart'],
    showEnd: row['showEnd'],
    pricingTier: row['pricingTier'] ?? null,
    demandByProduct: row['demandByProduct'] ?? null,
  });
}

function nextDayYmd(ymd: string): string {
  const ms = parseYmd(ymd);
  return ms === null ? ymd : formatYmd(ms + MS_PER_DAY);
}

/**
 * Expand the composer state into catalog-grid rows, merging consecutive days that share an identical
 * time/tier signature into a single {startDate, endDate} range row (matches ops-hub merge behavior).
 */
export function buildScheduleRows(state: EventScheduleComposerState, products: ScheduleProduct[], columns: ScheduleRowColumns): TableRow[] {
  const days = effectiveIncludedYmds(state);
  const merged: TableRow[] = [];
  let current: TableRow | null = null;
  let currentSig = '';

  for (const ymd of days) {
    const dayRow = buildDayRow(ymd, state, products, columns);
    const sig = rowSignature(dayRow);
    const consecutive = current !== null && currentSig === sig && nextDayYmd(String(current['endDate'])) === ymd;
    if (consecutive && current) {
      current['endDate'] = ymd;
    } else {
      if (current) merged.push(current);
      current = dayRow;
      currentSig = sig;
    }
  }
  if (current) merged.push(current);
  return merged;
}
