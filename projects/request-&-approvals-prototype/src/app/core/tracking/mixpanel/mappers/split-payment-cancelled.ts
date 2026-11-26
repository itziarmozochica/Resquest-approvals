import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class SplitPaymentCancelledMapper implements MixpanelTrackingMapper<TrackingEvent<unknown>> {
  map(event: TrackingEvent<unknown>): MixpanelEvent {
    return new MixpanelEvent('split_payment_cancelled', event.data);
  }
}
