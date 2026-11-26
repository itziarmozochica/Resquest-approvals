import { EditUserEvent } from '../../core/events/edit-user';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class EditUserMapper implements MixpanelTrackingMapper<EditUserEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('edit_user', event.data);
  }
}
