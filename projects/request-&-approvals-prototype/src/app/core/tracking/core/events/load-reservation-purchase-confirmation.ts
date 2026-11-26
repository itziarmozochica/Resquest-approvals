import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadReservationPurchaseConfirmationData {
  cart_id: string;
  plan_id: number;
  order_id: number;
  order_external_id: string;
}

export class LoadReservationPurchaseConfirmationEvent extends TrackingEvent<LoadReservationPurchaseConfirmationData> {
  constructor(readonly data: LoadReservationPurchaseConfirmationData) {
    super(TrackingEvents.LoadReservationPurchaseConfirmation, data);
  }
}
