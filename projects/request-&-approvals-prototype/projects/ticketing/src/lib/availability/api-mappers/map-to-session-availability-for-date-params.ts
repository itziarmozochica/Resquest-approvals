import type { SessionAvailabilityForDateQuery } from '../models/availability-query.model';
import { resolveWireChannel } from '../utils/resolve-wire-channel.util';
import { wallClockToLocalDate, wallClockToNaiveUtc } from '../utils/wall-clock-to-naive-utc.util';
import type { AvailabilityParams } from './availability-params.model';

export function mapToSessionAvailabilityForDateParams(query: SessionAvailabilityForDateQuery): AvailabilityParams {
  const channel = resolveWireChannel(query);

  return {
    ...mapToRequestedRange(query),
    include_ongoing: query.includeOngoing,
    ...(query.isHidden === undefined ? {} : { is_hidden: query.isHidden }),
    ...(channel === undefined ? {} : { channel }),
    ...(query.sessionTypeIds === undefined ? {} : { session_type_ids: query.sessionTypeIds }),
    ...(query.includeTimeSlotCapacity === undefined ? {} : { include_time_slot_capacity: query.includeTimeSlotCapacity }),
    ...(query.includeOverrideCapacity === true ? { include_override_capacity: true } : {}),
    ...(query.includeSoldOutSessions === undefined ? {} : { include_sold_out_sessions: query.includeSoldOutSessions }),
    ...(query.includeShopProducts === undefined ? {} : { include_shop_products: query.includeShopProducts }),
    ...(query.businessId === undefined ? {} : { business_id: query.businessId }),
    ...(query.rescheduleOrderId === undefined ? {} : { reschedule_order_id: query.rescheduleOrderId }),
    ...(query.rescheduleReservationId === undefined || query.rescheduleReservationId === ''
      ? {}
      : { reschedule_reservation_id: query.rescheduleReservationId }),
  };
}

function mapToRequestedRange(query: SessionAvailabilityForDateQuery): AvailabilityParams {
  if (query.startDatetime === undefined || query.endDatetime === undefined) {
    return {
      from_date: wallClockToNaiveUtc(query.fromDate, query.timezone),
      local_date: wallClockToLocalDate(query.fromDate),
    };
  }

  return {
    end_datetime: wallClockToNaiveUtc(query.endDatetime, query.timezone),
    start_datetime: wallClockToNaiveUtc(query.startDatetime, query.timezone),
  };
}
