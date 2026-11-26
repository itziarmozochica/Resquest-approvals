import { Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { DatesAvailabilityResponse } from '@fz-original/app/shared/services/session-availability/dates-availability.adapter';
import { GetDatesAvailabilityQuery } from '@fz-original/app/shared/services/session-availability/get-dates-availability-query';

@Injectable({
  providedIn: 'root',
})
export class DatesAvailabilityStoredService {
  #stored: Map<string, BaseResponse<DatesAvailabilityResponse>> = new Map();
  #channels: Channel[] = [Channel.BoxOffice, Channel.Kiosk];

  clear(): void {
    this.#stored.clear();
  }

  getResponseStored(query: GetDatesAvailabilityQuery): BaseResponse<DatesAvailabilityResponse> | null {
    const responseStored = this.#stored.get(this.#generateCacheKey(query));
    return !query.channel || !this.#channels.includes(query.channel) || !responseStored ? null : responseStored;
  }

  updateStored(query: GetDatesAvailabilityQuery, response: BaseResponse<DatesAvailabilityResponse>): void {
    this.#stored.set(this.#generateCacheKey(query), response);
    this.#initCacheTimeout(query);
  }

  #generateCacheKey(query: GetDatesAvailabilityQuery): string {
    return (
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
      query.rescheduleReservationId +
      '-' +
      query.cacheTimeoutInSeconds
    );
  }

  #initCacheTimeout(query: GetDatesAvailabilityQuery): void {
    // `cacheTimeoutInSeconds` missing or `<= 0` means "do not schedule an
    // expiration". `<= 0` is the signal `computeEffectiveCacheConfig` emits
    // for the `stale_while_revalidate` strategy, whose entries must survive
    // until the owning session clears them.
    if (query.cacheTimeoutInSeconds === undefined || query.cacheTimeoutInSeconds <= 0) {
      return;
    }
    setTimeout(() => {
      this.#stored.delete(this.#generateCacheKey(query));
    }, query.cacheTimeoutInSeconds * 1000);
  }
}
