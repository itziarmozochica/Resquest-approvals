import { LoadRescheduleEvent } from '../../core/events/load-reschedule';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadRescheduleMapper implements MixpanelTrackingMapper<LoadRescheduleEvent> {
  map(event: LoadRescheduleEvent): MixpanelEvent {
    return new MixpanelEvent('load_reschedule', event.data);
  }
}
