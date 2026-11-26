import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmOrdersBulkRescheduleData {
  reschedule_type: string;
  plan_id: number;
  plan_name: string;
  from_time_slot_id: number | null;
  from_time_slot_date: string;
  rescheduled_date: string;
  notification_message: string;
}

export class ConfirmOrdersBulkRescheduleEvent extends TrackingEvent<ConfirmOrdersBulkRescheduleData> {
  constructor(readonly data: ConfirmOrdersBulkRescheduleData) {
    super(TrackingEvents.ConfirmOrdersBulkReschedule, data);
  }
}
