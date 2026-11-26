import { InventoryNextStepEvent } from '../../core/events/inventory-next-step';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryNextStepMapper implements MixpanelTrackingMapper<InventoryNextStepEvent> {
  map(event: InventoryNextStepEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_next_step', event.data);
  }
}
