import { InventoryScheduleEditProductsEvent } from '../../core/events/inventory-schedule-edit-products';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleEditProductsMapper implements MixpanelTrackingMapper<InventoryScheduleEditProductsEvent> {
  map(event: InventoryScheduleEditProductsEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_edit_products', event.data);
  }
}
