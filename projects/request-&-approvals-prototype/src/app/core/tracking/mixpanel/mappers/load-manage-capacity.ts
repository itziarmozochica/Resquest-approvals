import { LoadManageCapacityEvent } from '../../core/events/load-manage-capacity';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadManageCapacityMapper implements MixpanelTrackingMapper<LoadManageCapacityEvent> {
  map(event: LoadManageCapacityEvent): MixpanelEvent {
    return new MixpanelEvent('load_manage_capacity', event.data);
  }
}
