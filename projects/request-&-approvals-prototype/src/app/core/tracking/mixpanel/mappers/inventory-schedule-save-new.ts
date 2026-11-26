import { InventoryScheduleSaveNewEvent } from '../../core/events/inventory-schedule-save-new';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleSaveNewMapper implements MixpanelTrackingMapper<InventoryScheduleSaveNewEvent> {
  map(event: InventoryScheduleSaveNewEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_save_new', event.data);
  }
}
