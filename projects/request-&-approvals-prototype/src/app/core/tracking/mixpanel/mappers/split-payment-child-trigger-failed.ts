import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class SplitPaymentChildTriggerFailedMapper implements MixpanelTrackingMapper<TrackingEvent<unknown>> {
  map(event: TrackingEvent<unknown>): MixpanelEvent {
    return new MixpanelEvent('split_payment_child_trigger_failed', event.data);
  }
}
