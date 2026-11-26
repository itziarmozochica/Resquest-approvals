import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickMakeReservationData {
  cart_id: string;
  plan_id: number;
  reservation_flow_type?: string;
  employee_id?: number;
  owner_id?: number;
}

export class ClickMakeReservationEvent extends TrackingEvent<ClickMakeReservationData> {
  constructor(readonly data: ClickMakeReservationData) {
    super(TrackingEvents.ClickMakeReservation, data);
  }
}
