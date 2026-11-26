import { OpenManageCapacityEvent } from '../../core/events/open-manage-capacity';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class OpenManageCapacityMapper implements MixpanelTrackingMapper<OpenManageCapacityEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('open_manage_capacity', event.data);
  }
}
