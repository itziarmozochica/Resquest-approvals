import { LoadReduceReservationEvent } from '../../core/events/load-reduce-reservation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadReduceReservationMapper implements MixpanelTrackingMapper<LoadReduceReservationEvent> {
  map(event: LoadReduceReservationEvent): MixpanelEvent {
    return new MixpanelEvent('load_reduce_reservation', event.data);
  }
}
