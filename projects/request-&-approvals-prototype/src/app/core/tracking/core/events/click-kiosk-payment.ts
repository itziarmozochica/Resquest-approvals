import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickKioskPaymentData {
  cartId: string;
  customerId?: number;
}

export class ClickKioskPaymentEvent extends TrackingEvent<ClickKioskPaymentData> {
  constructor(readonly data: ClickKioskPaymentData) {
    super(TrackingEvents.ClickKioskPayment, data);
  }
}
