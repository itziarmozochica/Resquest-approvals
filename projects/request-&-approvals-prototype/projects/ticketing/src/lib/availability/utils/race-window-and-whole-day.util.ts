import { catchError, defer, EMPTY, filter, map, merge, Subject, takeUntil, tap, type Observable } from 'rxjs';

import type { AvailabilityCacheEmission } from '../models/availability-cache.model';
import type { DaySummary, SessionAvailabilitySummary } from '../models/session-availability-summary.model';
import type { SessionsForDateEmission } from '../models/sessions-for-date-fetch.model';
import type { SessionsForDateWindow } from '../models/sessions-for-date-window.model';

export type SessionsForDateRaceEmission = Omit<SessionsForDateEmission, 'refreshesSettledDay'>;

export function raceWindowAndWholeDay(
  windowRead: Observable<AvailabilityCacheEmission<SessionAvailabilitySummary>>,
  wholeDayRead: Observable<SessionAvailabilitySummary>,
  window: SessionsForDateWindow,
): Observable<SessionsForDateRaceEmission> {
  return defer(() => {
    const wholeDaySettled = new Subject<void>();

    const settleWindow = windowRead.pipe(
      filter((emission: AvailabilityCacheEmission<SessionAvailabilitySummary>) => hasTimeslots(emission.value)),
      map(
        (emission: AvailabilityCacheEmission<SessionAvailabilitySummary>): SessionsForDateRaceEmission => ({
          isStale: emission.isStale,
          value: emission.value,
          window,
        }),
      ),
      catchError(() => EMPTY),
      takeUntil(wholeDaySettled),
    );

    const settleWholeDay = wholeDayRead.pipe(
      tap(() => {
        wholeDaySettled.next();
      }),
      map((value: SessionAvailabilitySummary): SessionsForDateRaceEmission => ({ isStale: false, value })),
    );

    return merge(settleWindow, settleWholeDay);
  });
}

function hasTimeslots(summary: SessionAvailabilitySummary): boolean {
  return summary.daySummaries.some((daySummary: DaySummary) => daySummary.timeslots.length > 0);
}
