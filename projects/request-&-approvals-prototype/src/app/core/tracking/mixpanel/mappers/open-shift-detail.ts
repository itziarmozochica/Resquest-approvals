import { OpenShiftDetailEvent } from '../../core/events/open-shift-detail';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class OpenShiftDetailMapper implements MixpanelTrackingMapper<OpenShiftDetailEvent> {
  map(event: OpenShiftDetailEvent): MixpanelEvent {
    return new MixpanelEvent('open_shift_detail', event.data);
  }
}
