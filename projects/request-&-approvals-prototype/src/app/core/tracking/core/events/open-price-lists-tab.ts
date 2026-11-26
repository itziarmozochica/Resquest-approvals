import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class OpenPriceListsTabEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.OpenPriceListsTab);
  }
}
