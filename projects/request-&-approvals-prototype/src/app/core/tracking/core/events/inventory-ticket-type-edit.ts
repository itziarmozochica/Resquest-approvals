import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class InventoryTicketTypeEditEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.InventoryTicketTypeEdit);
  }
}
