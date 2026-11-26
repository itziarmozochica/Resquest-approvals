import { DeactivateUserEvent } from '../../core/events/deactivate-user';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class DeactivateUserMapper implements MixpanelTrackingMapper<DeactivateUserEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('deactivate_user', event.data);
  }
}
