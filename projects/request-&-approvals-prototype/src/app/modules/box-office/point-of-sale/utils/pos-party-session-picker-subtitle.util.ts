import { formatTimeslotTimeLabel } from '@fz/ticketing-ui';

const subtitleSeparator = ' · ';

export function partySessionPickerSubtitle(category: string | null, leafName: string, startTime: string, timeZone: string): string {
  const place = category === null || category === leafName ? [leafName] : [category, leafName];

  return [...place, formatTimeslotTimeLabel(startTime, timeZone)].join(subtitleSeparator);
}
