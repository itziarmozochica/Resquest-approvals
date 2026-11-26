import { LoadReservationListEvent } from '../../core/events/load-reservation-list';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadReservationListMapper implements MixpanelTrackingMapper<LoadReservationListEvent> {
  map(event: LoadReservationListEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation|List', event.data);
  }
}
