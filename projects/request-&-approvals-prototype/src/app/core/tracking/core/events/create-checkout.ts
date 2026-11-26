import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { CreateCheckoutData } from './create-checkout.model';

export class CreateCheckoutEvent extends TrackingEvent<CreateCheckoutData> {
  constructor(readonly data: CreateCheckoutData) {
    super(TrackingEvents.CreateCheckout, data);
  }
}
