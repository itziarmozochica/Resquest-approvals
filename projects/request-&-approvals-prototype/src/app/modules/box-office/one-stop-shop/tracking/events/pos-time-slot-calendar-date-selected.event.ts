import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosTimeSlotCalendarDateSelectedData {
  selectedDate: string;
}

export const posTimeSlotCalendarDateSelected = defineEvent<PosTimeSlotCalendarDateSelectedData>('pos.time_slot.calendar.date.selected');
