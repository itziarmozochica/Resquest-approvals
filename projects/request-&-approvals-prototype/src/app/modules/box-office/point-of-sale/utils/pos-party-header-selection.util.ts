import { partyQuantityTotal } from '@fz/ticketing';
import { formatDatePillDayLabel, formatTimeslotHourLabel } from '@fz/ticketing-ui';

import type { PosPartyHeaderSelection, PosPartyHeaderSelectionParams } from '../models/pos-party-header-selection.model';

/** `null` outside party mode, before a day is loaded, and while the party is empty: the header line stays blank until a party is picked. */
export function buildPartyHeaderSelection(params: PosPartyHeaderSelectionParams): PosPartyHeaderSelection | null {
  const partySize = partyQuantityTotal(params.quantities);

  if (!params.isPartyMembersMode || params.selectedDate === null || partySize === 0) {
    return null;
  }

  return {
    dateLabel: formatDatePillDayLabel(params.selectedDate, params.locale, params.timeZone),
    hourLabel: params.hourFilter === null ? params.nowLabel : formatTimeslotHourLabel(params.hourFilter, params.timeZone),
    partySize,
  };
}
