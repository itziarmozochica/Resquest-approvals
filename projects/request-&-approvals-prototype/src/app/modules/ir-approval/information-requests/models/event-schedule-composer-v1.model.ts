/**
 * Full-parity port of the former tool's event-schedule composer state (V1).
 * Source of truth: fever-operations-hub `packages/hub-lib/information-requests/event-schedule-composer.ts`.
 * This file holds the data model + defaults only; parsing lives in `event-schedule-composer-v1.parse.ts`
 * and computation in `event-schedule-composer-v1.helpers.ts` (one-directional deps: helpers → parse → model).
 */

export const EVENT_SCHEDULE_COMPOSER_META_KEY = 'eventScheduleComposer';

/** Stable id for the placeholder band when meta has no ranges yet (avoids random IDs on every parse). */
export const EVENT_SCHEDULE_PLACEHOLDER_NAMED_RANGE_ID = 'nr-default';

/** Demand band for a product on a given day. Empty string means "unset". */
export type ScheduleDemandTier = 'Peak' | 'Standard' | 'Valley' | 'Closed' | '';

/** One concrete sellable time slot on a given weekday. End time is derived from the band duration. */
export interface SessionSlotV1 {
  id: string;
  start: string;
  /** Single demand tier for the whole slot ('' is treated as Standard). */
  tier: ScheduleDemandTier;
  /** Products sold in this slot. */
  productIds: string[];
}

/** Inclusive calendar span; optional per-override times override dow/global for those days only. */
export interface ScheduleDateOverrideV1 {
  startDate: string;
  endDate: string;
  products: Record<string, ScheduleDemandTier>;
  doorsOpen?: string;
  showStart?: string;
  showEnd?: string;
  baseNamedRangeId?: string;
}

/** Named season / promo band: span(s), optional weekday filter, inner exclusions, products and time slots. */
export interface NamedDateRangeV1 {
  id: string;
  name: string;
  rangeStart: string;
  rangeEnd: string;
  rangeSegments?: { start: string; end: string }[];
  /** If non-empty, only these JS weekdays (0=Sun … 6=Sat) are open inside the span. */
  onlyDows: number[];
  excludedDates: string[];
  /** Raw editor rows for the excluded ("closed") date ranges; `excludedDates` is the expanded flat form. */
  excludedRanges?: { start: string; end: string }[];
  /** Full ticket-types repeater JSON for this band only. */
  bandTicketTypesAnswer?: string;
  /** Single session duration (minutes) for every slot in this band; slot end = start + durationMin. */
  durationMin?: number;
  /** Per JS weekday ("0".."6") list of sellable time slots. */
  dowSlots: Record<string, SessionSlotV1[]>;
}

export interface EventScheduleComposerStateV1 {
  v: 1;
  dateOverrides: ScheduleDateOverrideV1[];
  namedDateRanges?: NamedDateRangeV1[];
}

/** A sellable product (ticket type). `subcategories` carries Peak/Valley variants when present. */
export interface ProductRow {
  id: string;
  name: string;
  capacity?: string;
  pricing?: string;
  productType?: string;
  subcategories?: {
    capacity?: string;
    category?: string;
    id: string;
    name: string;
    pricing?: string;
  }[];
}

/** One concrete session window for a day, after applying a weekday template. */
export interface SessionWindow {
  start: string;
  end: string;
  doorsOpen: string;
  tier: ScheduleDemandTier;
}

/** A generated catalog-grid row (one day or a merged consecutive-day range). */
export interface CatalogGridRow {
  startDate: string;
  endDate: string;
  doorsOpen: string;
  showStart: string;
  showEnd: string;
  pricingTier?: string;
}

export function normalizeTier(s: string): ScheduleDemandTier {
  const t = s.trim();
  if (t === 'Peak' || t === 'Standard' || t === 'Valley' || t === 'Closed') return t;
  return '';
}

export function defaultNamedDateRange(id: string): NamedDateRangeV1 {
  return {
    id,
    name: '',
    rangeStart: '',
    rangeEnd: '',
    onlyDows: [],
    excludedDates: [],
    dowSlots: {},
  };
}

export function defaultEventScheduleComposerState(): EventScheduleComposerStateV1 {
  return {
    v: 1,
    dateOverrides: [],
    namedDateRanges: [],
  };
}

/** Ensures at least one named band exists so the editor always has a first card to fill. */
export function ensureDefaultNamedDateRangeWhenEmpty(state: EventScheduleComposerStateV1): EventScheduleComposerStateV1 {
  if ((state.namedDateRanges?.length ?? 0) > 0) return state;
  return { ...state, namedDateRanges: [defaultNamedDateRange(EVENT_SCHEDULE_PLACEHOLDER_NAMED_RANGE_ID)] };
}
