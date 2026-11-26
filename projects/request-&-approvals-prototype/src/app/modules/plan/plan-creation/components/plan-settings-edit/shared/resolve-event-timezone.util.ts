import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import moment from 'moment-timezone';

const defaultEventTimezone = 'UTC';

export function resolveEventTimezone(plan: Plan | null | undefined): string {
  const candidates = [plan?.timezone, ...(plan?.places ?? []).map(place => place.city?.timeZone)];

  return candidates.find(isSupportedTimezone) ?? defaultEventTimezone;
}

function isSupportedTimezone(timezone: string | null | undefined): timezone is string {
  return !!timezone && moment.tz.zone(timezone) !== null;
}
