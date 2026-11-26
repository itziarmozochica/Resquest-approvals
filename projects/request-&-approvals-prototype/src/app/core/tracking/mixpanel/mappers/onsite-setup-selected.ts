import { OnsiteSetupSelectedEvent } from '../../core/events/onsite-setup-selected';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class OnsiteSetupSelectedMapper implements MixpanelTrackingMapper<OnsiteSetupSelectedEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('onsite_setup_selected', event.data);
  }
}
