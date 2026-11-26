export interface PicklistOptionRow {
  label: string;
  helper: string;
  askDetail: boolean;
}

export interface PersistedPicklistRows {
  options: string[];
  helpers: string[] | null;
  askDetail: boolean[] | null;
}

/** Build editable rows from persisted options + helpers + askDetail (aligned by index). */
export function picklistRowsFromState(
  options: string[] | null | undefined,
  helpers: string[] | null | undefined,
  askDetail: boolean[] | null | undefined,
): PicklistOptionRow[] {
  const opts = Array.isArray(options) ? options.map(s => String(s ?? '')) : [];
  const hel = Array.isArray(helpers) ? helpers.map(s => String(s ?? '')) : [];
  const ask = Array.isArray(askDetail) ? askDetail.map(Boolean) : [];
  const length = Math.max(opts.length, hel.some(h => h.trim().length > 0) ? hel.length : 0, ask.some(Boolean) ? ask.length : 0, 1);
  return Array.from({ length }, (_, i) => ({
    label: opts[i] ?? '',
    helper: hel[i] ?? '',
    askDetail: Boolean(ask[i]),
  }));
}

/** Persist labels + helpers (index-aligned), trimming empty-label rows. */
export function picklistRowsToPersisted(rows: PicklistOptionRow[], includeAskDetail: boolean): PersistedPicklistRows {
  const kept = rows.filter(r => r.label.trim().length > 0);
  const options = kept.map(r => r.label.trim());
  const helpersRaw = kept.map(r => r.helper.trim());
  const helpers = helpersRaw.some(h => h.length > 0) ? helpersRaw : null;
  let askDetail: boolean[] | null = null;
  if (includeAskDetail) {
    const flags = kept.map(r => Boolean(r.askDetail));
    if (flags.some(Boolean)) askDetail = flags;
  }
  return { options, helpers, askDetail };
}
