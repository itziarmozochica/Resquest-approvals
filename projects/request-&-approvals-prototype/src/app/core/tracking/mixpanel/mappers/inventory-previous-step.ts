import { InventoryPreviousStepEvent } from '../../core/events/inventory-previous-step';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryPreviousStepMapper implements MixpanelTrackingMapper<InventoryPreviousStepEvent> {
  map(event: InventoryPreviousStepEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_previous_step', event.data);
  }
}
