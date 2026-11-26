import { SavePriceOverrideEvent } from '../../core/events/save-price-override';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SavePriceOverrideMapper implements MixpanelTrackingMapper<SavePriceOverrideEvent> {
  map(event: SavePriceOverrideEvent): MixpanelEvent {
    return new MixpanelEvent('save_price_override', event.data);
  }
}
