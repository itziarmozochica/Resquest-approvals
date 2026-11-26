import { LoadMakeReservationEvent } from '../../core/events/load-make-reservation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadMakeReservationMapper implements MixpanelTrackingMapper<LoadMakeReservationEvent> {
  map(event: LoadMakeReservationEvent): MixpanelEvent {
    return new MixpanelEvent('load_make_reservation', event.data);
  }
}
