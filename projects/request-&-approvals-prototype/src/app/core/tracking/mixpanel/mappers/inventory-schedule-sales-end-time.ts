import { InventoryScheduleSalesEndTimeEvent } from '../../core/events/inventory-schedule-sales-end-time';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleSalesEndTimeMapper implements MixpanelTrackingMapper<InventoryScheduleSalesEndTimeEvent> {
  map(event: InventoryScheduleSalesEndTimeEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_sales_end_time', event.data);
  }
}
