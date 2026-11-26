// Angular wiring. The service is a collaborator of a consumer *store* — never inject it into a component.
export { TicketingAvailabilityService } from './services/availability.service';
export { withAvailability } from './with-availability';

export { TICKETING_AVAILABILITY_REQUEST } from './tokens/availability-request-context.token';

// Opt-in front cache (TTL + stale-while-revalidate). A passive store-with-policy: the consumer store
// decides when to consult it — see the "Availability domain contracts" section of the package AGENTS.md.
export { AvailabilityCacheService } from './services/availability-cache.service';
export { withAvailabilityCache } from './with-availability-cache';

export { withAvailabilityFetch } from './with-availability-fetch';
export type {
  AvailabilityFetchConfig,
  AvailabilityFetchContext,
  AvailabilityFetchGate,
  AvailabilityFetchOptimisation,
} from './models/availability-fetch.model';
export type { SessionsForDateWindow } from './models/sessions-for-date-window.model';
export type {
  AvailabilityCacheEmission,
  DatesAvailabilityCacheKey,
  SessionAvailabilityForDateCacheKey,
} from './models/availability-cache.model';

// Store feature — consumers compose it into their own `signalStore(...)`; the library ships no store.
export { withAvailabilityStoreFeature, type WithAvailabilityStoreFeature } from './store/availability.feature';
export type { AvailabilityStoreState } from './models/store/availability-store.model';

export { withEagerSessionsStoreFeature, type WithEagerSessionsStoreFeature } from './store/eager-sessions.feature';
export { fetchOfDay } from './utils/sessions-for-date-fetch.util';
export type {
  SessionsForDateCachePolicy,
  SessionsForDateEmission,
  SessionsForDateFetch,
  SessionsForDatePrefetch,
  SessionsForDatePreload,
} from './models/sessions-for-date-fetch.model';

// The Session → TicketType fold: the availability payload has no ticket-type list, so a consumer
// store turns a timeslot's sessions into selector rows with this. The one adapter that is public.
export { adaptSessionsToTicketTypes, adaptSessionToTicketType } from './api-adapters/adapt-session-to-ticket-type';

// Multi-day ("ongoing") session filter — the single home of the predicate, so a consumer store and
// whatever it mirrors into agree on which day summaries survive a `sessions_for_date/` fetch. The
// bare predicate is public too: legacy `OngoingSessionUtil.isBucketOngoingOnDate` call sites migrate
// onto it instead of reimplementing the boundary check.
export {
  filterToSelectedAndOngoingDaySummaries,
  isDaySummaryOngoingOnDate,
} from './utils/filter-to-selected-and-ongoing-day-summaries.util';

// The ongoing rows a selector shows beside the selected timeslot: one group per earlier day whose
// sessions still run on the selected date, each session once. Built on the same predicate.
export { buildOngoingGroups, type OngoingSessionGroup } from './utils/build-ongoing-groups.util';

// Domain models, including nested types so consumers can type fields and view-models.
export type { DateAvailability, DatesAvailability } from './models/date-availability.model';
export type { DaySummary, SessionAvailabilitySummary, TimeslotSummary } from './models/session-availability-summary.model';
export type {
  BookingQuestion,
  ReservationRestriction,
  Seating,
  Session,
  SessionType,
  SessionTypeTag,
  SharedAvailabilityRule,
  SharedAvailabilityRuleItemType,
  TicketsAllowed,
} from './models/session.model';
export { SessionSelectorType } from './models/session-selector-type.enum';

// Query contracts of the three availability endpoints.
export type {
  AvailabilityDataConsistency,
  DatesAvailabilityQuery,
  SessionAvailabilityForDateQuery,
  SessionAvailabilityQuery,
} from './models/availability-query.model';

export type {
  PartyCategory,
  PartyFit,
  PartyFitParams,
  PartyHierarchy,
  PartyLeaf,
  PartyMember,
  PartyMemberSessionOptions,
  PartyQuantities,
  PartySessionAllocationFit,
  PartySessionChoice,
  SessionAdditionStep,
  SessionQuantities,
} from './models/party-members/party-members.model';
export {
  fitPartyAtLeaf,
  fitPartyAtTimeslot,
  fitPartySessionAllocation,
  nextAllowedSessionAddition,
  partySessionChoiceAt,
  remainingTicketsOf,
} from './utils/party-members/party-fit.util';
export {
  buildPartyHierarchy,
  partyLeafKeyOfSession,
  partyLeafPath,
  partyLeavesInCategory,
  partySessionName,
} from './utils/party-members/party-hierarchy.util';
export {
  derivePartyMembers,
  isPartyEligibleSession,
  partyEligibleSessionsOfDay,
  partyMemberKey,
  partyMemberKeysOfSession,
} from './utils/party-members/party-members.util';
export {
  canDecreasePartyMember,
  partyQuantityTotal,
  reconcilePartyQuantities,
  setPartyMemberQuantity,
} from './utils/party-members/party-quantities.util';
export {
  derivePartyStartTimes,
  filterTimeslotsFromHour,
  isPartyDayAfterSearch,
  isStartTimeAtOrAfter,
  partyTimeslotsOfDay,
  resolvePartyHourFilter,
} from './utils/party-members/party-start-times.util';
