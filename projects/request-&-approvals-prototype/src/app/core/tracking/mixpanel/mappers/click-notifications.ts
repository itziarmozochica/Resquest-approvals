import { ClickNotificationsEvent } from '../../core/events/click-notifications';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickNotificationsMapper implements MixpanelTrackingMapper<ClickNotificationsEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_notifications', event.data);
  }
}
