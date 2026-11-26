import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export type InventoryTicketTypeCreateSource = 'header_button' | 'group_row' | 'duplicate_row';

export interface InventoryTicketTypeCreateData {
  source: InventoryTicketTypeCreateSource;
}

export class InventoryTicketTypeCreateEvent extends TrackingEvent<InventoryTicketTypeCreateData> {
  constructor(readonly data: InventoryTicketTypeCreateData) {
    super(TrackingEvents.InventoryTicketTypeCreate, data);
  }
}
