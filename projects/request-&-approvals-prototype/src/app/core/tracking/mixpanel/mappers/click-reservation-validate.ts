import { ClickReservationValidateEvent } from '../../core/events/click-reservation-validate';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickReservationValidateMapper implements MixpanelTrackingMapper<ClickReservationValidateEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_reservation_validate', event.data);
  }
}
