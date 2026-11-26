import { ClickUserReservationsEvent } from '../../core/events/click-user-reservations';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickUserReservationsMapper implements MixpanelTrackingMapper<ClickUserReservationsEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_user_reservations', event.data);
  }
}
