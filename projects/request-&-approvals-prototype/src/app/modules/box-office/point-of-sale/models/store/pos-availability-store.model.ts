import type { Channel } from '@fz/channel';
import type {
  AvailabilityDataConsistency,
  DateAvailability,
  DaySummary,
  SessionAvailabilitySummary,
  SessionsForDateWindow,
} from '@fz/ticketing';

export type PosAvailabilityAction = 'fetchEmpty' | 'fetchError' | 'fetchSuccess' | null;

export interface PosAvailabilityStoreState {
  availabilityAction: PosAvailabilityAction;
  /** Payload order of `daySummaries`: "selected day = last bucket" must not depend on record key order. */
  daySummaryOrder: string[];
  fromDateIso: string | null;
  /** The settled `sessions_for_date/` window while the whole day it belongs to is still loading. */
  pendingWholeDayWindow: SessionsForDateWindow | null;
  selectedAvailabilityFromDate: string | null;
}

export const initialState: PosAvailabilityStoreState = {
  availabilityAction: null,
  daySummaryOrder: [],
  fromDateIso: null,
  pendingWholeDayWindow: null,
  selectedAvailabilityFromDate: null,
};

export interface PosAvailabilityCacheConfig {
  ttlSeconds?: number;
  useCache: boolean;
  useSwr: boolean;
}

export interface PosModifyOrderChannels {
  onsiteSetupChannelId: string;
  original: string;
}

export interface PosAvailabilityRequest {
  accumulateDates: boolean;
  cache: PosAvailabilityCacheConfig;
  /** CAPN single-day guard applies (`daysWithActiveSession === 1`, CAPN partner, box-office channel). */
  capnSingleDayGuard: boolean;
  channel: Channel;
  dataConsistency: AvailabilityDataConsistency;
  daysWithActiveSession: number;
  /** Wall clock (`YYYY-MM-DDTHH:mm:ss`), never an instant: `wallClockToNaiveUtc` throws on a `Z` suffix. */
  fromDate: string;
  includeOngoing: boolean;
  includeOngoingForSessions: boolean;
  needsAvailabilityFromDateSeed: boolean;
  onlyGetSessions: boolean;
  partnerId: string;
  placeId: string;
  planId: string;
  timezone: string;
  businessId?: string;
  channelId?: string;
  contentLanguage?: string;
  includeOverrideCapacity?: boolean;
  includeShopProducts?: boolean;
  includeSoldOutSessions?: boolean;
  includeTimeSlotCapacity?: boolean;
  isHidden?: boolean;
  modifyOrderChannels?: PosModifyOrderChannels;
  /** The modified order's first session start: the window of its day is that minute alone instead of the hours around now. */
  modifyOrderSessionStartsAt?: string;
  rescheduleOrderId?: string;
  rescheduleReservationId?: string;
  sessionTypeIds?: readonly string[];
}

export interface PosAvailabilityQueryChannel {
  readonly channel: string;
  readonly channelId: string | undefined;
}

export interface PosAvailabilityCancel {
  kind: 'cancel';
}

export type PosAvailabilityFetchInput = PosAvailabilityCancel | PosAvailabilityRequest;

export interface PosAvailabilityDatesResolvedEvent {
  accumulateDates: boolean;
  dates: readonly DateAvailability[];
  /** Same wall-clock format as `PosAvailabilityRequest.fromDate` — read it back as UTC midnight. */
  fromDateIso: string;
  kind: 'datesResolved';
  nextAvailableDate: string | null;
  selectedAvailabilityFromDate: string | null;
  selectedDate: string | null;
}

export interface PosAvailabilitySettledEvent {
  isStaleEmission: boolean;
  kind: 'settled';
  orderedDaySummaries: readonly DaySummary[];
  summary: SessionAvailabilitySummary;
  /**
   * The dates window resolved empty and `summary` is the store-built synthetic one. The bridge must
   * then keep the legacy state fields (legacy built this response from the component's own values).
   */
  isEmptyDatesResult?: boolean;
  refreshesSettledDay?: boolean;
}

export interface PosAvailabilityFailedEvent {
  error: unknown;
  kind: 'failed';
}

export interface PosAvailabilitySupersededEvent {
  kind: 'superseded';
}

export type PosAvailabilityFlowEvent =
  | PosAvailabilityDatesResolvedEvent
  | PosAvailabilityFailedEvent
  | PosAvailabilitySettledEvent
  | PosAvailabilitySupersededEvent;

export type PosAvailabilityFlowHandler = (event: PosAvailabilityFlowEvent) => void;

/** The store's mutable instance values, held in `withProps` so the methods share them. */
export interface PosAvailabilityStoreRuntime {
  flowHandler: PosAvailabilityFlowHandler | null;
}
