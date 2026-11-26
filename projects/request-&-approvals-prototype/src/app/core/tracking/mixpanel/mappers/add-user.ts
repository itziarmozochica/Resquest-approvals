import { AddUserEvent } from '../../core/events/add-user';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class AddUserMapper implements MixpanelTrackingMapper<AddUserEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('add_user', event.data);
  }
}
