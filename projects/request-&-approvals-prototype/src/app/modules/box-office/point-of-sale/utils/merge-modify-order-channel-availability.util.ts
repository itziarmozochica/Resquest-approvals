import type { DaySummary, Session, SessionAvailabilitySummary, TimeslotSummary } from '@fz/ticketing';

export function mergeModifyOrderChannelAvailability(
  original: SessionAvailabilitySummary,
  onsiteSetup: SessionAvailabilitySummary,
): SessionAvailabilitySummary {
  return {
    ...original,
    daySummaries: mergeByKey(original.daySummaries, onsiteSetup.daySummaries, daySummary => daySummary.date, mergeDaySummaries).sort(
      (first, second) => first.date.localeCompare(second.date),
    ),
  };
}

function mergeDaySummaries(original: DaySummary, onsiteSetup: DaySummary): DaySummary {
  return {
    ...original,
    timeslots: mergeByKey(original.timeslots, onsiteSetup.timeslots, timeslot => timeslot.datetime, mergeTimeslots).sort(
      (first, second) => Date.parse(first.datetime) - Date.parse(second.datetime),
    ),
  };
}

function mergeTimeslots(original: TimeslotSummary, onsiteSetup: TimeslotSummary): TimeslotSummary {
  return {
    ...original,
    sessions: mergeByKey(
      original.sessions,
      onsiteSetup.sessions,
      session => session.id,
      (originalSession: Session) => originalSession,
    ),
  };
}

function mergeByKey<TItem, TKey>(
  original: readonly TItem[],
  onsiteSetup: readonly TItem[],
  keyOf: (item: TItem) => TKey,
  mergeBoth: (originalItem: TItem, onsiteSetupItem: TItem) => TItem,
): TItem[] {
  const onsiteSetupByKey = new Map(onsiteSetup.map(item => [keyOf(item), item]));
  const originalKeys = new Set(original.map(keyOf));
  const merged = original.map(item => {
    const onsiteSetupItem = onsiteSetupByKey.get(keyOf(item));

    return onsiteSetupItem === undefined ? item : mergeBoth(item, onsiteSetupItem);
  });

  return [...merged, ...onsiteSetup.filter(item => !originalKeys.has(keyOf(item)))];
}
