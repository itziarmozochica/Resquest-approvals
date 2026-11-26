import { ResetUserPasswordEvent } from '../../core/events/reset-user-password';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ResetUserPasswordMapper implements MixpanelTrackingMapper<ResetUserPasswordEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('reset_user_password', event.data);
  }
}
