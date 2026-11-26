import { Channel } from './channel.enum';

export interface GetAvailableSessionQuery {
  cacheTimeoutInSeconds: number;
  daysWithActiveSession: number;
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
  resellerId?: number;
  sessionTypeIds?: Array<number>;
  utc?: boolean;
}
