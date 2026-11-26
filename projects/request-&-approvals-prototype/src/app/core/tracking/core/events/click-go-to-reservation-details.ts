import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickGoToReservationDetailsData {
  plan_id: number;
  reservation_id: string;
  reservation_locator: string;
}

export class ClickGoToReservationDetailsEvent extends TrackingEvent<ClickGoToReservationDetailsData> {
  constructor(readonly data: ClickGoToReservationDetailsData) {
    super(TrackingEvents.ClickGoToReservationDetails, data);
  }
}
