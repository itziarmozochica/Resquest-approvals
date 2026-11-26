import { Injectable } from '@angular/core';

import { BaseResponse } from '../../models/base-response';
import { SessionAvailabilitySummary } from '../../models/session-availability/session-availability-summary.model';
import { Channel } from './channel.enum';
import { GetAvailableSessionForDateQuery } from './get-available-session-for-date-query';

@Injectable({
  providedIn: 'root',
})
export class SessionAvailabilityForDateStoredService {
  #stored: Map<string, BaseResponse<SessionAvailabilitySummary>> = new Map();
  #channels: Array<Channel> = [Channel.BoxOffice, Channel.Kiosk];

  clear(): void {
    this.#stored.clear();
  }

  getResponseStored(query: GetAvailableSessionForDateQuery): BaseResponse<SessionAvailabilitySummary> | null {
    const responseStored = this.#stored.get(this.#generateCacheKey(query));
    if (!query.channel || !this.#channels.includes(query.channel) || !responseStored) {
      return null;
    }
    return responseStored;
  }

  updateStored(
    query: GetAvailableSessionForDateQuery,
    response: BaseResponse<SessionAvailabilitySummary>,
    isCacheSwrEnabled: boolean = false,
  ): void {
    this.#stored.set(this.#generateCacheKey(query), response);
    if (!isCacheSwrEnabled) {
      this.#initCacheTimeout(query);
    }
  }

  #generateCacheKey(query: GetAvailableSessionForDateQuery): string {
    return (
      query.partnerId +
      '-' +
      query.partnerId +
      '-' +
      query.planId +
      '-' +
      query.placeId +
      '-' +
      query.fromDate +
      '-' +
      query.timezone +
      '-' +
      query.includeOngoing +
      '-' +
      query.isHidden +
      '-' +
      query.channel +
      '-' +
      query.channelId +
      '-' +
      query.sessionTypeIds +
      '-' +
      query.includeSoldOutSessions +
      '-' +
      query.includeOverrideCapacity +
      '-' +
      query.cacheTimeoutInSeconds +
      '-' +
      query.contentLanguage +
      '-' +
      query.rescheduleOrderId +
      '-' +
      query.rescheduleReservationId
    );
  }

  #initCacheTimeout(query: GetAvailableSessionForDateQuery): void {
    setTimeout(() => {
      this.#stored.delete(this.#generateCacheKey(query));
    }, query.cacheTimeoutInSeconds * 1000);
  }
}
