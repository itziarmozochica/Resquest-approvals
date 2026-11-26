import type { SessionAvailabilityQuery } from '../models/availability-query.model';
import { resolveWireChannel } from '../utils/resolve-wire-channel.util';
import { wallClockToNaiveUtc } from '../utils/wall-clock-to-naive-utc.util';
import type { AvailabilityParams } from './availability-params.model';

export function mapToSessionAvailabilityParams(query: SessionAvailabilityQuery): AvailabilityParams {
  const channel = resolveWireChannel(query);

  return {
    days_with_active_session: query.daysWithActiveSession,
    from_date: wallClockToNaiveUtc(query.fromDate, query.timezone),
    include_ongoing: query.includeOngoing,
    ...(query.isHidden === undefined ? {} : { is_hidden: query.isHidden }),
    ...(channel === undefined ? {} : { channel }),
    ...(query.includeTimeSlotCapacity === undefined ? {} : { include_time_slot_capacity: query.includeTimeSlotCapacity }),
    ...(query.includeOverrideCapacity === true ? { include_override_capacity: true } : {}),
    ...(query.sessionTypeIds === undefined ? {} : { session_type_ids: query.sessionTypeIds }),
    ...(query.includeSoldOutSessions === undefined ? {} : { include_sold_out_sessions: query.includeSoldOutSessions }),
    ...(query.rescheduleOrderId === undefined ? {} : { reschedule_order_id: query.rescheduleOrderId }),
    ...(query.rescheduleReservationId === undefined || query.rescheduleReservationId === ''
      ? {}
      : { reschedule_reservation_id: query.rescheduleReservationId }),
  };
}
