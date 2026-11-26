import { Injectable } from '@angular/core';

import { BaseResponse } from '../../models/base-response';
import { SessionAvailabilitySummary } from '../../models/session-availability/session-availability-summary.model';
import { Channel } from './channel.enum';
import { GetAvailableSessionQuery } from './get-available-session-query';

@Injectable({
  providedIn: 'root',
})
export class SessionAvailabilityStoredService {
  #stored: Map<string, BaseResponse<SessionAvailabilitySummary>> = new Map();
  #channels: Array<Channel> = [Channel.BoxOffice];

  clear(): void {
    this.#stored.clear();
  }

  getResponseStored(query: GetAvailableSessionQuery): BaseResponse<SessionAvailabilitySummary> | null {
    const responseStored = this.#stored.get(this.#generateCacheKey(query));
    return !query.channel || !this.#channels.includes(query.channel) || !responseStored ? null : responseStored;
  }

  updateStored(query: GetAvailableSessionQuery, response: BaseResponse<SessionAvailabilitySummary>): void {
    this.#stored.set(this.#generateCacheKey(query), response);
    this.#initCacheTimeout(query);
  }

  #generateCacheKey(query: GetAvailableSessionQuery): string {
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
      query.daysWithActiveSession +
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

  #initCacheTimeout(query: GetAvailableSessionQuery): void {
    // `cacheTimeoutInSeconds <= 0` means "do not schedule an expiration":
    // it is the signal `computeEffectiveCacheConfig` emits for the
    // `stale_while_revalidate` strategy, whose entries must survive until the
    // owning session clears them.
    if (query.cacheTimeoutInSeconds <= 0) {
      return;
    }
    setTimeout(() => {
      this.#stored.delete(this.#generateCacheKey(query));
    }, query.cacheTimeoutInSeconds * 1000);
  }
}
