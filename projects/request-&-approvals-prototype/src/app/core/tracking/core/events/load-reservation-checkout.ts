import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadReservationCheckoutData {
  cart_id: string;
  plan_id: number;
  reservation_id?: string;
}

export class LoadReservationCheckoutEvent extends TrackingEvent<LoadReservationCheckoutData> {
  constructor(readonly data: LoadReservationCheckoutData) {
    super(TrackingEvents.LoadReservationCheckout, data);
  }
}
