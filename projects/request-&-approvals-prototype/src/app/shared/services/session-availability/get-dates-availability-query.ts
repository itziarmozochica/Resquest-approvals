import { Channel } from './channel.enum';

export interface GetDatesAvailabilityQuery {
  partnerId: number;
  planId: number;
  placeId: number;
  fromDate: Date;
  daysWithActiveSession: number;
  timezone: string;
  includeOngoing: boolean;
  isHidden?: boolean;
  channel?: Channel;
  channelId?: string;
  sessionTypeIds?: Array<number>;
  includeSoldOutSessions?: boolean;
  rescheduleReservationId?: string;
  cacheTimeoutInSeconds?: number;
  utc?: boolean;
}
