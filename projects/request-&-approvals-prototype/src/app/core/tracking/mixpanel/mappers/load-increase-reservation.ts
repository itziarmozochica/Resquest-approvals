import { LoadIncreaseReservationEvent } from '../../core/events/load-increase-reservation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadIncreaseReservationMapper implements MixpanelTrackingMapper<LoadIncreaseReservationEvent> {
  map(event: LoadIncreaseReservationEvent): MixpanelEvent {
    return new MixpanelEvent('load_increase_reservation', event.data);
  }
}
