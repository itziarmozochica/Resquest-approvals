import { ConfirmCancellationEvent } from '../../core/events/confirm-cancellation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ConfirmCancellationMapper implements MixpanelTrackingMapper<ConfirmCancellationEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('cancel_order', event.data);
  }
}
