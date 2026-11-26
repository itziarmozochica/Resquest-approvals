import { TimeSlotTier } from '@fz-original/app/shared/services/time-slot-tier/time-slot-tier.model';

import { TimeSlotStaffNoteDTO } from '../../../../shared/models/timeslot/timeslot-staff-note';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

type TimeSlotTierValues = Omit<TimeSlotTier, 'id'>;

export interface UpdateTimeslotData {
  new: {
    capacity?: number;
    staff_note?: TimeSlotStaffNoteDTO;
    tier?: TimeSlotTierValues | null;
  };
  plan_id: number;
  previous: {
    capacity?: number;
    staff_note?: TimeSlotStaffNoteDTO;
    tier?: TimeSlotTierValues | null;
  };
  time_slot_id: number;
}

export class UpdateTimeslotEvent extends TrackingEvent<UpdateTimeslotData> {
  constructor(readonly data: UpdateTimeslotData) {
    super(TrackingEvents.UpdateTimeslot, data);
  }
}
