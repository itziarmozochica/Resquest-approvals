import { InventoryScheduleSaveExistingEvent } from '../../core/events/inventory-schedule-save-existing';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleSaveExistingMapper implements MixpanelTrackingMapper<InventoryScheduleSaveExistingEvent> {
  map(event: InventoryScheduleSaveExistingEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_save_existing', event.data);
  }
}
