import { InventoryScheduleDefinitionDatesEvent } from '../../core/events/inventory-schedule-definition-dates';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleDefinitionDatesMapper implements MixpanelTrackingMapper<InventoryScheduleDefinitionDatesEvent> {
  map(event: InventoryScheduleDefinitionDatesEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_definition_dates', event.data);
  }
}
