import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosTimeSlotDatePickerType = 'date' | 'more_dates';

export interface PosTimeSlotDatePickerSelectedData {
  datePickerType: PosTimeSlotDatePickerType;
  dateSelected: string;
}

export const posTimeSlotDatePickerSelected = defineEvent<PosTimeSlotDatePickerSelectedData>('pos.time_slot.date_picker.selected');
