import type { DaySummary } from '../models/session-availability-summary.model';
import type { Session } from '../models/session.model';
import { isSessionOngoingOnDate, type OngoingSessionInstants } from './filter-to-selected-and-ongoing-day-summaries.util';

export interface OngoingSessionGroup {
  readonly date: string;
  readonly sessions: readonly Session[];
}

/**
 * One group per earlier day with sessions that still run at the selected timeslot or at `now`, or on
 * the selected date when no timeslot is selected. A group lists those sessions once each, in timeslot
 * order, so a session sold in two timeslots of that day is one row; a day left with none is dropped.
 * Without a selected date there is nothing to be ongoing against, and the result is empty.
 */
export function buildOngoingGroups(
  daySummaries: readonly DaySummary[],
  selectedDate: string | null,
  timeZone: string,
  instants: OngoingSessionInstants = { selectedDatetime: null },
): readonly OngoingSessionGroup[] {
  if (selectedDate === null) {
    return [];
  }

  return daySummaries
    .filter(daySummary => daySummary.date < selectedDate)
    .map(daySummary => ({
      date: daySummary.date,
      sessions: uniqueSessions(daySummary).filter(session => isSessionOngoingOnDate(session, selectedDate, timeZone, instants)),
    }))
    .filter(group => group.sessions.length > 0);
}

function uniqueSessions(daySummary: DaySummary): readonly Session[] {
  const seenSessionIds = new Set<number>();
  const sessions: Session[] = [];

  for (const timeslot of daySummary.timeslots) {
    for (const session of timeslot.sessions) {
      if (!seenSessionIds.has(session.id)) {
        seenSessionIds.add(session.id);
        sessions.push(session);
      }
    }
  }

  return sessions;
}
