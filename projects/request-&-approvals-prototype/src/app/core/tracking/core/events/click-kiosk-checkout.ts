import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickKioskCheckoutData {
  cartId: string;
}

export class ClickKioskCheckoutEvent extends TrackingEvent<ClickKioskCheckoutData> {
  constructor(readonly data: ClickKioskCheckoutData) {
    super(TrackingEvents.ClickKioskCheckout, data);
  }
}
