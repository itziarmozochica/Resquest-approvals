import { InventoryScheduleRemoveProductsEvent } from '../../core/events/inventory-schedule-remove-products';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleRemoveProductsMapper implements MixpanelTrackingMapper<InventoryScheduleRemoveProductsEvent> {
  map(event: InventoryScheduleRemoveProductsEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_remove_products', event.data);
  }
}
