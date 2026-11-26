import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickReservationPayData {
  cart_id: string;
  plan_id: number;
  payment_provider: string;
  payment_method?: string;
  reservation_id?: string;
}

export class ClickReservationPayEvent extends TrackingEvent<ClickReservationPayData> {
  constructor(readonly data: ClickReservationPayData) {
    super(TrackingEvents.ClickReservationPay, data);
  }
}
