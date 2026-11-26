import { UpdateOnsiteSetupEvent } from '../../core/events/update-onsite-setup';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class UpdateOnsiteSetupMapper implements MixpanelTrackingMapper<UpdateOnsiteSetupEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('update_onsite_setup', event.data);
  }
}
