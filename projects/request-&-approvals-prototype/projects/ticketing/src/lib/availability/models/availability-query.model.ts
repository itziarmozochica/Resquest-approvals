export type AvailabilityDataConsistency = 'materialized' | 'real_time';

export interface AvailabilityQueryBase {
  fromDate: string;
  includeOngoing: boolean;
  partnerId: string;
  placeId: string;
  planId: string;
  timezone: string;
  channel?: string;
  channelId?: string;
  includeSoldOutSessions?: boolean;
  isHidden?: boolean;
  sessionTypeIds?: readonly string[];
}

export interface DatesAvailabilityQuery extends AvailabilityQueryBase {
  daysWithActiveSession: number;
  dataConsistency?: AvailabilityDataConsistency;
}

export interface SessionAvailabilityQuery extends AvailabilityQueryBase {
  daysWithActiveSession: number;
  includeOverrideCapacity?: boolean;
  includeTimeSlotCapacity?: boolean;
  rescheduleOrderId?: string;
  rescheduleReservationId?: string;
}

export interface SessionAvailabilityForDateQuery extends AvailabilityQueryBase {
  businessId?: string;
  endDatetime?: string;
  includeOverrideCapacity?: boolean;
  includeShopProducts?: boolean;
  includeTimeSlotCapacity?: boolean;
  rescheduleOrderId?: string;
  rescheduleReservationId?: string;
  startDatetime?: string;
}
