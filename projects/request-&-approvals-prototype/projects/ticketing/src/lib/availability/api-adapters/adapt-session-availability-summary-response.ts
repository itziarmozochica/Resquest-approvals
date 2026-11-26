import { assertIsDefined } from '@fz/utils/assert-is-defined';

import type {
  DaySummaryApi,
  SessionAvailabilitySummaryResponse,
  TimeslotSummaryApi,
} from '../models/api/session-availability-summary-response.model';
import type { DaySummary, SessionAvailabilitySummary, TimeslotSummary } from '../models/session-availability-summary.model';
import { SessionSelectorType } from '../models/session-selector-type.enum';
import type { SharedAvailabilityBudgets } from '../models/session.model';
import { adaptSessionApi, adaptSharedAvailabilityBudgetsApi } from './adapt-session-api';

const SESSION_SELECTOR_TYPE_BY_VALUE: Partial<Record<string, SessionSelectorType>> = Object.values(SessionSelectorType).reduce<
  Partial<Record<string, SessionSelectorType>>
>((accumulator, selectorType) => {
  accumulator[selectorType] = selectorType;

  return accumulator;
}, {});

export function adaptSessionAvailabilitySummaryResponse(
  body: SessionAvailabilitySummaryResponse,
  appliesCartWideSharedAvailability: boolean = false,
): SessionAvailabilitySummary {
  const data = body.data;
  assertIsDefined(data);

  const sharedAvailabilityBudgets = adaptSharedAvailabilityBudgetsApi(
    appliesCartWideSharedAvailability ? data.shared_availability_budgets : undefined,
  );

  return {
    allowMultiSessionPurchase: data.allow_multi_session_purchase,
    daySummaries: Object.entries(data.date_summaries).map(([date, daySummary]) =>
      adaptDaySummaryApi(date, daySummary, sharedAvailabilityBudgets),
    ),
    hasExplodePipe: data.has_explode_pipe,
    nextAvailableDate: data.next_available_date ?? null,
    productSummaries: data.product_summaries.map(session => adaptSessionApi(session, sharedAvailabilityBudgets)),
    sessionSelectorType: adaptSessionSelectorType(data.session_selector_type),
    timezone: data.timezone,
  };
}

function adaptDaySummaryApi(date: string, daySummary: DaySummaryApi, sharedAvailabilityBudgets: SharedAvailabilityBudgets): DaySummary {
  return {
    date,
    timeslots: Object.entries(daySummary.datetime_summaries).map(([datetime, timeslot]) =>
      adaptTimeslotSummaryApi(datetime, timeslot, sharedAvailabilityBudgets),
    ),
  };
}

function adaptSessionSelectorType(value: string | null | undefined): SessionSelectorType | null {
  if (value === undefined || value === null) {
    return null;
  }

  return SESSION_SELECTOR_TYPE_BY_VALUE[value] ?? null;
}

function adaptTimeslotSummaryApi(
  datetime: string,
  timeslot: TimeslotSummaryApi,
  sharedAvailabilityBudgets: SharedAvailabilityBudgets,
): TimeslotSummary {
  return {
    capacity: timeslot.capacity,
    datetime,
    overrideCapacity: timeslot.override_capacity ?? null,
    sessions: timeslot.sessions.map(session => adaptSessionApi(session, sharedAvailabilityBudgets)),
  };
}
