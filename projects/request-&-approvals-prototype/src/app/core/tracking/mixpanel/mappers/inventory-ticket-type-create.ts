import { InventoryTicketTypeCreateEvent } from '../../core/events/inventory-ticket-type-create';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryTicketTypeCreateMapper implements MixpanelTrackingMapper<InventoryTicketTypeCreateEvent> {
  map(event: InventoryTicketTypeCreateEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_ticket_type_create', event.data);
  }
}
