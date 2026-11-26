import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class LoadBillingEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.LoadBilling);
  }
}
