/**
 * Parsing sub-helpers for the V1 event-schedule composer.
 * Depends only on the model — the public `parseEventScheduleComposerMeta` lives in the helpers file
 * because it also needs the calendar-resolution helpers (one-directional: helpers → parse → model).
 */
import { defaultNamedDateRange, NamedDateRangeV1, normalizeTier, ProductRow, SessionSlotV1 } from './event-schedule-composer-v1.model';

const HM = /^\d{2}:\d{2}$/;

/** Parse a list of per-day time slots ({ id, start, tier, productIds }). Slots need a valid HH:MM start. */
export function parseSessionSlots(raw: unknown): SessionSlotV1[] {
  if (!Array.isArray(raw)) return [];
  const slots: SessionSlotV1[] = [];
  let i = 0;
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const start = String(o['start'] ?? '').trim();
    if (!HM.test(start)) continue;
    const id = String(o['id'] ?? '').trim() || `slot-${i}`;
    const productIds = Array.isArray(o['productIds'])
      ? [...new Set((o['productIds'] as unknown[]).map(x => String(x ?? '').trim()).filter(Boolean))]
      : [];
    slots.push({ id, productIds, start, tier: normalizeTier(String(o['tier'] ?? '')) });
    i += 1;
  }
  return slots;
}

/** Parse the per JS weekday ("0".."6") slot lists, dropping weekdays with no valid slots. */
export function parseDowSlots(raw: unknown): Record<string, SessionSlotV1[]> {
  const out: Record<string, SessionSlotV1[]> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const slots = parseSessionSlots(v);
    if (slots.length) out[k] = slots;
  }
  return out;
}

export function parseNamedDateRanges(raw: unknown): NamedDateRangeV1[] {
  if (!Array.isArray(raw)) return [];
  const out: NamedDateRangeV1[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const it = item as Record<string, unknown>;
    const id = String(it['id'] ?? '').trim() || `nr-${out.length}`;
    const nr = defaultNamedDateRange(id);
    nr.name = String(it['name'] ?? '');
    nr.rangeStart = String(it['rangeStart'] ?? '').trim();
    nr.rangeEnd = String(it['rangeEnd'] ?? '').trim();
    if (Array.isArray(it['rangeSegments'])) {
      const segs: { start: string; end: string }[] = [];
      for (const seg of it['rangeSegments'] as unknown[]) {
        if (!seg || typeof seg !== 'object' || Array.isArray(seg)) continue;
        const o = seg as Record<string, unknown>;
        segs.push({ start: String(o['start'] ?? '').trim(), end: String(o['end'] ?? '').trim() });
      }
      if (segs.length > 0) nr.rangeSegments = segs;
    }
    if (Array.isArray(it['onlyDows'])) {
      nr.onlyDows = (it['onlyDows'] as unknown[]).map(x => Number(x)).filter(n => n >= 0 && n <= 6 && Number.isFinite(n));
    }
    if (Array.isArray(it['excludedDates'])) {
      nr.excludedDates = (it['excludedDates'] as unknown[]).map(x => String(x ?? '').trim()).filter(Boolean);
    }
    if (Array.isArray(it['excludedRanges'])) {
      const ranges: { start: string; end: string }[] = [];
      for (const seg of it['excludedRanges'] as unknown[]) {
        if (!seg || typeof seg !== 'object' || Array.isArray(seg)) continue;
        const o = seg as Record<string, unknown>;
        ranges.push({ start: String(o['start'] ?? '').trim(), end: String(o['end'] ?? '').trim() });
      }
      if (ranges.length > 0) nr.excludedRanges = ranges;
    }
    const bta = it['bandTicketTypesAnswer'];
    if (typeof bta === 'string' && bta.trim()) nr.bandTicketTypesAnswer = bta.trim();
    const durationMin = Number(it['durationMin']);
    if (Number.isFinite(durationMin) && durationMin > 0) nr.durationMin = Math.max(1, Math.floor(durationMin));
    nr.dowSlots = parseDowSlots(it['dowSlots']);
    out.push(nr);
  }
  return out;
}

/**
 * Minimal ticket-types parser for band-embedded products. Accepts the v2 bundle `{products:[...]}`
 * shape or a plain rows array, returning `{products}`; band products are fully wired in a later phase.
 */
export function parseTicketTypesAnswer(raw: string): { products: ProductRow[] } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>)['products'])
      ? ((parsed as Record<string, unknown>)['products'] as unknown[])
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>)['rows'])
        ? ((parsed as Record<string, unknown>)['rows'] as unknown[])
        : null;
  if (!rows) return null;
  const products: ProductRow[] = [];
  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object') return;
    const o = row as Record<string, unknown>;
    const name = String(o['name'] ?? o['ticketType'] ?? '').trim();
    if (!name) return;
    const id = String(o['id'] ?? `p-${index}`).trim() || `p-${index}`;
    const subcategories = Array.isArray(o['subcategories'])
      ? o['subcategories']
          .map((sub, subIndex) => {
            if (!sub || typeof sub !== 'object') return null;
            const so = sub as Record<string, unknown>;
            const subName = String(so['name'] ?? so['category'] ?? '').trim();
            const subId = String(so['id'] ?? `${id}-sub-${subIndex}`).trim();
            const category =
              String(so['category'] ?? '')
                .trim()
                .toLowerCase() || undefined;
            return {
              capacity: String(so['capacity'] ?? '').trim() || undefined,
              category,
              id: subId || `${id}-sub-${subIndex}`,
              name: subName || subId || `${id} ${subIndex + 1}`,
              pricing: String(so['pricing'] ?? '').trim() || undefined,
            };
          })
          .filter((sub): sub is NonNullable<typeof sub> => sub !== null)
      : undefined;
    const capacity = String(o['capacity'] ?? '').trim() || undefined;
    const pricing = String(o['pricing'] ?? '').trim() || undefined;
    const productType = String(o['productType'] ?? '').trim() || undefined;
    products.push({
      id,
      name,
      ...(capacity ? { capacity } : {}),
      ...(pricing ? { pricing } : {}),
      ...(productType ? { productType } : {}),
      ...(subcategories?.length ? { subcategories } : {}),
    });
  });
  return { products };
}
