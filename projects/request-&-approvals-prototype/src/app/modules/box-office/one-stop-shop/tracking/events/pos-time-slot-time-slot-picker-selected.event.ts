import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosTimeSlotTimeSlotPickerSelectedData {
  selectedTimeSlot: string;
}

export const posTimeSlotTimeSlotPickerSelected = defineEvent<PosTimeSlotTimeSlotPickerSelectedData>(
  'pos.time_slot.time_slot_picker.selected',
);
