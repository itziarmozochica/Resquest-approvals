import type { BaseResponse } from '@fz/http-models';

import type { ReservationExternalLocator, ReservationExternalLocatorApi } from '../models/reservation-external-locator.model';

/**
 * The value comes back **normalized by the backend**, not echoed from the request: it trims, and turns a blank
 * string into `null`. That is why the call answers a value at all instead of nothing — a caller that redisplayed
 * its own argument would show a reference the reservation does not carry.
 */
export function adaptReservationExternalLocator(
  response: BaseResponse<ReservationExternalLocatorApi> | null,
): ReservationExternalLocator | null {
  const data = response?.data;

  if (data === null || data === undefined) {
    return null;
  }

  return { externalReservationId: data.external_locator_id ?? null };
}
