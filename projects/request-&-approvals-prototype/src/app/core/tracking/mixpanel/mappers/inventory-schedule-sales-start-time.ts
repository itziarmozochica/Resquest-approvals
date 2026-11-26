import { InventoryScheduleSalesStartTimeEvent } from '../../core/events/inventory-schedule-sales-start-time';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleSalesStartTimeMapper implements MixpanelTrackingMapper<InventoryScheduleSalesStartTimeEvent> {
  map(event: InventoryScheduleSalesStartTimeEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_sales_start_time', event.data);
  }
}
