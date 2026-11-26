import type { DatesAvailabilityQuery } from '../models/availability-query.model';
import { resolveWireChannel } from '../utils/resolve-wire-channel.util';
import { wallClockToNaiveUtc } from '../utils/wall-clock-to-naive-utc.util';
import type { AvailabilityParams } from './availability-params.model';

export function mapToDatesAvailabilityParams(query: DatesAvailabilityQuery): AvailabilityParams {
  const channel = resolveWireChannel(query);

  return {
    data_consistency: query.dataConsistency ?? 'real_time',
    days_with_active_session: query.daysWithActiveSession,
    from_date: wallClockToNaiveUtc(query.fromDate, query.timezone),
    include_ongoing: query.includeOngoing,
    ...(query.isHidden === undefined ? {} : { is_hidden: query.isHidden }),
    ...(channel === undefined ? {} : { channel }),
    ...(query.includeSoldOutSessions === undefined ? {} : { include_sold_out_sessions: query.includeSoldOutSessions }),
    ...(query.sessionTypeIds === undefined ? {} : { session_type_ids: query.sessionTypeIds }),
  };
}
