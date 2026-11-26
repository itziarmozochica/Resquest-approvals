import { LoadReservationConfirmationEvent } from '../../core/events/load-reservation-confirmation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadReservationConfirmationMapper implements MixpanelTrackingMapper<LoadReservationConfirmationEvent> {
  map(event: LoadReservationConfirmationEvent): MixpanelEvent {
    return new MixpanelEvent('load_reservation_confirmation', event.data);
  }
}
