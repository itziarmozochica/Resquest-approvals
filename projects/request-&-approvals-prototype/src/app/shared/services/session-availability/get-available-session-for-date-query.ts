import { Channel } from './channel.enum';

export interface GetAvailableSessionForDateQuery {
  cacheTimeoutInSeconds: number;
  fromDate: Date;
  includeOngoing: boolean;
  partnerId: number;
  placeId: number;
  planId: number;
  timezone: string;
  afterEqualsDateTimeAware?: Date;
  businessId?: string;
  channel?: Channel;
  channelId?: string;
  contentLanguage?: string;
  includeOverrideCapacity?: boolean;
  includeShopProducts?: boolean;
  includeSoldOutSessions?: boolean;
  includeTimeSlotCapacity?: boolean;
  isHidden?: boolean;
  rescheduleOrderId?: number;
  rescheduleReservationId?: string;
  sessionTypeIds?: Array<number>;
  utc?: boolean;
}
