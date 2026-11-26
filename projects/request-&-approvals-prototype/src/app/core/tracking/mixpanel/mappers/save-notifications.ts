import { SaveNotificationsEvent } from '../../core/events/save-notifications';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class SaveNotificationsMapper implements MixpanelTrackingMapper<SaveNotificationsEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('save_notifications', event.data);
  }
}
