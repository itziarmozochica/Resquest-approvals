import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosPartyStartTimeTappedData {
  partySize: number;
  startTime: string;
  tileName: string;
}

export const posPartyStartTimeTapped = defineEvent<PosPartyStartTimeTappedData>('pos.party.start.time.tapped');
