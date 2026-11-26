import { CreateOnsiteSetupEvent } from '../../core/events/create-onsite-setup';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class CreateOnsiteSetupMapper implements MixpanelTrackingMapper<CreateOnsiteSetupEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('create_onsite_setup', event.data);
  }
}
