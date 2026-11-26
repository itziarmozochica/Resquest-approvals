import { RestoreSinglePriceOverrideEvent } from '../../core/events/restore-single-price-override';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class RestoreSinglePriceOverrideMapper implements MixpanelTrackingMapper<RestoreSinglePriceOverrideEvent> {
  map(event: RestoreSinglePriceOverrideEvent): MixpanelEvent {
    return new MixpanelEvent('restore_single_price_override', event.data);
  }
}
