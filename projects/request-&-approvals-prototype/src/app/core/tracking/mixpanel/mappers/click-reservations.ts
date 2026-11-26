import { ClickReservationsEvent } from '../../core/events/click-reservations';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickReservationsMapper implements MixpanelTrackingMapper<ClickReservationsEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_reservations', event.data);
  }
}
