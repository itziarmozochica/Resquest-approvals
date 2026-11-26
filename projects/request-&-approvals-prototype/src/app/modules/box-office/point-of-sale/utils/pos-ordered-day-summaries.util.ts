import type { DaySummary } from '@fz/ticketing';

/** The day summaries in the store's order; the rendered day is the last one, as everywhere in this module. */
export function orderedDaySummaries(
  daySummaryOrder: readonly string[],
  daySummaries: Readonly<Record<string, DaySummary>>,
): readonly DaySummary[] {
  return daySummaryOrder
    .map((date: string) => daySummaries[date])
    .filter((daySummary: DaySummary | undefined): daySummary is DaySummary => daySummary !== undefined);
}
