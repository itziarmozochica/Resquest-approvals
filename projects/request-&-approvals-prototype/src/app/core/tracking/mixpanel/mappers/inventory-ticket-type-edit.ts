import { InventoryTicketTypeEditEvent } from '../../core/events/inventory-ticket-type-edit';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryTicketTypeEditMapper implements MixpanelTrackingMapper<InventoryTicketTypeEditEvent> {
  map(event: InventoryTicketTypeEditEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_ticket_type_edit', event.data);
  }
}
