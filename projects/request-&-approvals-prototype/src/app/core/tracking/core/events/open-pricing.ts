import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class OpenPricingEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.OpenPricing);
  }
}
