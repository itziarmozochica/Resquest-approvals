import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickOrdersEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickOrders);
  }
}
