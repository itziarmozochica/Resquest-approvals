import { InventoryScheduleSeeDetailsEvent } from '../../core/events/inventory-schedule-see-details';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleSeeDetailsMapper implements MixpanelTrackingMapper<InventoryScheduleSeeDetailsEvent> {
  map(event: InventoryScheduleSeeDetailsEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_see_details', event.data);
  }
}
