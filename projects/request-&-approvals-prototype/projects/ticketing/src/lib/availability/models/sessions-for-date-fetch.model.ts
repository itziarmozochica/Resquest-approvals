import type { Observable, Subscription } from 'rxjs';

import type { SessionAvailabilityForDateQuery } from './availability-query.model';
import type { SessionAvailabilitySummary } from './session-availability-summary.model';
import type { SessionsForDateWindow } from './sessions-for-date-window.model';

export interface SessionsForDateCachePolicy {
  readonly useCache: boolean;
  readonly useSwr: boolean;
  readonly contentLanguage?: string;
  readonly ttlSeconds?: number;
}

export interface SessionsForDateFetch {
  readonly cache: SessionsForDateCachePolicy;
  readonly queries: readonly SessionAvailabilityForDateQuery[];
  readonly modifyOrderSessionStartsAt?: string;
  readonly merge?: (summaries: readonly SessionAvailabilitySummary[]) => SessionAvailabilitySummary;
}

export interface SessionsForDatePreload {
  readonly fetch: SessionsForDateFetch;
  readonly fromDate: string;
}

export interface SessionsForDatePreloadedDay {
  readonly call: Subscription;
  readonly kept: SessionAvailabilitySummary | null;
  readonly wholeDay: Observable<SessionAvailabilitySummary> | null;
}

export interface SessionsForDateEmission {
  readonly isStale: boolean;
  readonly refreshesSettledDay: boolean;
  readonly value: SessionAvailabilitySummary;
  readonly window?: SessionsForDateWindow;
}

export interface SessionsForDatePrefetch {
  readonly emissions: Observable<SessionsForDateEmission>;
  readonly fromDate: string;
  readonly cancel: () => void;
}
