import { LoginSuccessfulEvent } from '../../core/events/login-successful';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class LoginSuccessfulMapper implements MixpanelTrackingMapper<LoginSuccessfulEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('login_success', event.data);
  }
}
