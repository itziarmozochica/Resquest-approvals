import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmTimeSlotModificationData {
  error_code: string | null;
  is_success: boolean;
  new: {
    ends_at: string;
    open_gates_at: string | null;
    sales_ends_at: string;
    sales_starts_at: string | null;
    starts_at: string;
  };
  original: {
    ends_at: string;
    open_gates_at: string | null;
    sales_ends_at: string;
    sales_starts_at: string | null;
    starts_at: string;
  };
  place_id: number;
  plan_id: number;
  send_notifications?: boolean;
  ticket_count: number;
  time_slot_id: number;
}

export class ConfirmTimeSlotModificationEvent extends TrackingEvent<ConfirmTimeSlotModificationData> {
  constructor(readonly data: ConfirmTimeSlotModificationData) {
    super(TrackingEvents.ConfirmTimeSlotModification, data);
  }
}
