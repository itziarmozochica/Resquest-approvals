import { InventoryScheduleEditExceptionsEvent } from '../../core/events/inventory-schedule-edit-exceptions';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleEditExceptionsMapper implements MixpanelTrackingMapper<InventoryScheduleEditExceptionsEvent> {
  map(event: InventoryScheduleEditExceptionsEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_edit_exceptions', event.data);
  }
}
