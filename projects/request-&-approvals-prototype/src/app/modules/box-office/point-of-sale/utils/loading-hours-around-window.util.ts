import type { SessionsForDateWindow } from '@fz/ticketing';
import type { FztLoadingHoursVm } from '@fz/ticketing-ui';

const MIDNIGHT_SUFFIX = 'T00:00:00';

export function loadingHoursAroundWindow(window: SessionsForDateWindow | null): FztLoadingHoursVm {
  if (window === null) {
    return { after: false, before: false };
  }

  return { after: !window.endDatetime.endsWith(MIDNIGHT_SUFFIX), before: !window.startDatetime.endsWith(MIDNIGHT_SUFFIX) };
}
