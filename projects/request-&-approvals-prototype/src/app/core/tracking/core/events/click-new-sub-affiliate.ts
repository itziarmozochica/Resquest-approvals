import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickNewSubAffiliateEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickNewSubAffiliate);
  }
}
