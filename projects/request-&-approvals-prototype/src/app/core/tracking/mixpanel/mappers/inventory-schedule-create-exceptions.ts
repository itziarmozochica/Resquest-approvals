import { InventoryScheduleCreateExceptionsEvent } from '../../core/events/inventory-schedule-create-exceptions';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleCreateExceptionsMapper implements MixpanelTrackingMapper<InventoryScheduleCreateExceptionsEvent> {
  map(event: InventoryScheduleCreateExceptionsEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_create_exceptions', event.data);
  }
}
