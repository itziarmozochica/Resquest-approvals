import { LoadPricingEvent } from '../../core/events/load-pricing';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadPricingMapper implements MixpanelTrackingMapper<LoadPricingEvent> {
  map(event: LoadPricingEvent): MixpanelEvent {
    return new MixpanelEvent('load_pricing', event.data);
  }
}
