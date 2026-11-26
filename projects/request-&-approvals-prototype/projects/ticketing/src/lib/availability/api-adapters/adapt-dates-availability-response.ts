import { assertIsDefined } from '@fz/utils/assert-is-defined';

import type { DatesAvailabilityResponse } from '../models/api/dates-availability-response.model';
import type { DateAvailability, DatesAvailability } from '../models/date-availability.model';

export function adaptDatesAvailabilityResponse(body: DatesAvailabilityResponse): DatesAvailability {
  const data = body.data;
  assertIsDefined(data);

  const dates = Object.entries(data.dates).reduce<Record<string, DateAvailability>>((accumulator, [date, entry]) => {
    accumulator[date] = { date, isPurchasable: entry.purchasable };

    return accumulator;
  }, {});

  return { dates, nextAvailableDate: data.next_available_date ?? null };
}
