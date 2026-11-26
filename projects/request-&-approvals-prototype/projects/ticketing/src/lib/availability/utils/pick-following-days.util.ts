import type { DateAvailability } from '../models/date-availability.model';

const DATE_LENGTH = 10;

export function pickFollowingDays(dates: readonly DateAvailability[], fromDate: string, count: number): string[] {
  const fromDay = fromDate.slice(0, DATE_LENGTH);

  return dates
    .filter((date: DateAvailability) => date.isPurchasable && date.date.slice(0, DATE_LENGTH) > fromDay)
    .slice(0, count)
    .map((date: DateAvailability) => `${date.date.slice(0, DATE_LENGTH)}T00:00:00`);
}
