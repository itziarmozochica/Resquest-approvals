import { ReactivateUserEvent } from '../../core/events/reactivate-user';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ReactivateUserMapper implements MixpanelTrackingMapper<ReactivateUserEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('reactivate_user', event.data);
  }
}
