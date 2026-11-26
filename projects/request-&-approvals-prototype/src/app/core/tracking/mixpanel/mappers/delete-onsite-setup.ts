import { DeleteOnsiteSetupEvent } from '../../core/events/delete-onsite-setup';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class DeleteOnsiteSetupMapper implements MixpanelTrackingMapper<DeleteOnsiteSetupEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('delete_onsite_setup', event.data);
  }
}
