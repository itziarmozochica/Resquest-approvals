import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class InventoryTicketTypeGroupEditEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.InventoryTicketTypeGroupEdit);
  }
}
