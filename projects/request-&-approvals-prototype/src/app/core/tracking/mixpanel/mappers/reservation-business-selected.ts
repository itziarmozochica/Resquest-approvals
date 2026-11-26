import { ReservationBusinessSelectedEvent } from '../../core/events/reservation-business-selected';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ReservationBusinessSelectedMapper implements MixpanelTrackingMapper<ReservationBusinessSelectedEvent> {
  map(event: ReservationBusinessSelectedEvent): MixpanelEvent {
    return new MixpanelEvent('reservation_business_selected', event.data);
  }
}
