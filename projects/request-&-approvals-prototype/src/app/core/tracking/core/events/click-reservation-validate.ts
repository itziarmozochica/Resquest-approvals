import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickReservationValidateData {
  reservation_id: string;
  plan_id: number;
  plan_name: string;
  place_name: string;
  place_id: number;
}

export class ClickReservationValidateEvent extends TrackingEvent<ClickReservationValidateData> {
  constructor(readonly data: ClickReservationValidateData) {
    super(TrackingEvents.ClickReservationValidate, data);
  }
}
