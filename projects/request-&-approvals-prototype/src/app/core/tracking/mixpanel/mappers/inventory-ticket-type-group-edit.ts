import { InventoryTicketTypeGroupEditEvent } from '../../core/events/inventory-ticket-type-group-edit';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryTicketTypeGroupEditMapper implements MixpanelTrackingMapper<InventoryTicketTypeGroupEditEvent> {
  map(event: InventoryTicketTypeGroupEditEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_ticket_type_group_edit', event.data);
  }
}
