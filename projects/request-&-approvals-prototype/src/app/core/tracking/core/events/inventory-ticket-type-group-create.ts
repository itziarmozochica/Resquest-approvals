import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class InventoryTicketTypeGroupCreateEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.InventoryTicketTypeGroupCreate);
  }
}
