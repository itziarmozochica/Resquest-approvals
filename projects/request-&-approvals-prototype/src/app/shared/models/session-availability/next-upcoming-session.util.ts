import { SessionAvailabilitySummaryByDatetime } from './session-availability-summary-by-datetime.model';

/**
 * Sessions stay purchasable until they expire, not until they start, so the 09:00 slot of a day that
 * expires at 23:00 is still on offer — and still preselected — at 10:00. Behind
 * `box_office_preselect_next_upcoming_session` the counter opens on the slot the customer is actually
 * buying: the earliest one still to start, and the one that started most recently once the day has
 * none left (GAME-1552).
 *
 * Contract: every `datetime` carries a UTC offset (`Z` or `±HH:mm`), so comparing instants needs no
 * timezone of its own. `Date.parse` reads a datetime written without one as the operator's machine
 * time, which shifts every comparison here by the machine-to-venue gap and preselects the wrong slot
 * with nothing to show for it — the guarantee
 * `SessionAvailabilitySummaryByDatetime#getHoursDifferenceFromNow` already rests on. A `datetime`
 * that does not parse at all is skipped rather than compared.
 */
export function pickNextUpcomingSession(
  selectableSessions: readonly SessionAvailabilitySummaryByDatetime[],
  now: number = Date.now(),
): SessionAvailabilitySummaryByDatetime | null {
  let earliestUpcoming: SessionAvailabilitySummaryByDatetime | null = null;
  let earliestUpcomingStart = Number.POSITIVE_INFINITY;
  let latestStarted: SessionAvailabilitySummaryByDatetime | null = null;
  let latestStartedStart = Number.NEGATIVE_INFINITY;

  for (const session of selectableSessions) {
    const startsAt = Date.parse(session.datetime);
    if (Number.isNaN(startsAt)) {
      continue;
    }

    if (startsAt > now) {
      if (startsAt < earliestUpcomingStart) {
        earliestUpcoming = session;
        earliestUpcomingStart = startsAt;
      }
      continue;
    }

    if (startsAt > latestStartedStart) {
      latestStarted = session;
      latestStartedStart = startsAt;
    }
  }

  return earliestUpcoming ?? latestStarted;
}
