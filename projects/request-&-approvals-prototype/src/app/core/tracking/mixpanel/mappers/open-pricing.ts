import { OpenPricingEvent } from '../../core/events/open-pricing';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class OpenPricingMapper implements MixpanelTrackingMapper<OpenPricingEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('open_pricing', event.data);
  }
}
