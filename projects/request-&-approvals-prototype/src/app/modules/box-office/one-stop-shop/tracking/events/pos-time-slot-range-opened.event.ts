import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosTimeSlotRange = 'afternoon' | 'evening' | 'morning' | 'night';

export interface PosTimeSlotRangeOpenedData {
  range: PosTimeSlotRange;
}

export const posTimeSlotRangeOpened = defineEvent<PosTimeSlotRangeOpenedData>('pos.time_slot.range.opened');
