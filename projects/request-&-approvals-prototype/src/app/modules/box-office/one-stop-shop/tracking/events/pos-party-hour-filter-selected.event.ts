import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosPartyHourFilterSelectedData {
  hour: string | null;
}

export const posPartyHourFilterSelected = defineEvent<PosPartyHourFilterSelectedData>('pos.party.hour.filter.selected');
