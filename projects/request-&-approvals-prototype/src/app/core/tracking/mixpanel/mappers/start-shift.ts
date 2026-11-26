import { StartShiftEvent } from '../../core/events/start-shift';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class StartShiftMapper implements MixpanelTrackingMapper<StartShiftEvent> {
  map(event: StartShiftEvent): MixpanelEvent {
    return new MixpanelEvent('start_shift', event.data);
  }
}
