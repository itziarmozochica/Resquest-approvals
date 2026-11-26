import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { type PosTimeSlotRange } from './pos-time-slot-range-opened.event';

export interface PosTimeSlotRangeClosedData {
  range: PosTimeSlotRange;
}

export const posTimeSlotRangeClosed = defineEvent<PosTimeSlotRangeClosedData>('pos.time_slot.range.closed');
