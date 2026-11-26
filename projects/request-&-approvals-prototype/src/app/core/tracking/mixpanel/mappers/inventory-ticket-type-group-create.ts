import { InventoryTicketTypeGroupCreateEvent } from '../../core/events/inventory-ticket-type-group-create';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryTicketTypeGroupCreateMapper implements MixpanelTrackingMapper<InventoryTicketTypeGroupCreateEvent> {
  map(event: InventoryTicketTypeGroupCreateEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_ticket_type_group_create', event.data);
  }
}
