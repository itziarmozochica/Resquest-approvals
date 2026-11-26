import { OpenCancellationEvent } from '../../core/events/open-cancellation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class OpenCancellationMapper implements MixpanelTrackingMapper<OpenCancellationEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('open_cancellation', event.data);
  }
}
