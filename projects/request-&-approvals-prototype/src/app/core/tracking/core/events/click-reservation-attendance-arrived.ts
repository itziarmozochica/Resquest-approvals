import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickReservationAttendanceArrivedData {
  reservation_id: string;
  plan_id: number;
  plan_name: string;
  place_name: string;
  place_id: number;
}

export class ClickReservationAttendanceArrivedEvent extends TrackingEvent<ClickReservationAttendanceArrivedData> {
  constructor(readonly data: ClickReservationAttendanceArrivedData) {
    super(TrackingEvents.ClickReservationAttendanceArrived, data);
  }
}
