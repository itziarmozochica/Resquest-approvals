import { ClickReservationPayEvent } from '../../core/events/click-reservation-pay';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickReservationPayMapper implements MixpanelTrackingMapper<ClickReservationPayEvent> {
  map(event: ClickReservationPayEvent): MixpanelEvent {
    return new MixpanelEvent('click_reservation_pay', event.data);
  }
}
