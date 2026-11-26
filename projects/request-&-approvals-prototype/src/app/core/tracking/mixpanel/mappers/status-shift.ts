import { StatusShiftEvent } from '../../core/events/status-shift';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class StatusShiftMapper implements MixpanelTrackingMapper<StatusShiftEvent> {
  map(event: StatusShiftEvent): MixpanelEvent {
    return new MixpanelEvent('status_shift', event.data);
  }
}
