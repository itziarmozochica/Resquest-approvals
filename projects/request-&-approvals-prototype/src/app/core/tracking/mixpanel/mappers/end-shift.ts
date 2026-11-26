import { EndShiftEvent } from '../../core/events/end-shift';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class EndShiftMapper implements MixpanelTrackingMapper<EndShiftEvent> {
  map(event: EndShiftEvent): MixpanelEvent {
    return new MixpanelEvent('end_shift', event.data);
  }
}
