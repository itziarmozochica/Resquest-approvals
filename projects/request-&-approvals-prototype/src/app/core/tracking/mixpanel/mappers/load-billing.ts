import { LoadBillingEvent } from '../../core/events/load-billing';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class LoadBillingMapper implements MixpanelTrackingMapper<LoadBillingEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('load_billing', event.data);
  }
}
