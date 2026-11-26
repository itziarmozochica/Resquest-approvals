import { InventoryChangeTabEvent } from '../../core/events/inventory-change-tab';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryChangeTabMapper implements MixpanelTrackingMapper<InventoryChangeTabEvent> {
  map(event: InventoryChangeTabEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_change_tab', event.data);
  }
}
