import { InventoryScheduleAddNewEvent } from '../../core/events/inventory-schedule-add-new';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleAddNewMapper implements MixpanelTrackingMapper<InventoryScheduleAddNewEvent> {
  map(event: InventoryScheduleAddNewEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_add_new', event.data);
  }
}
