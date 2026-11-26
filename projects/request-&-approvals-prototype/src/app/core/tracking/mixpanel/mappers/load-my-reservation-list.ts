import { LoadMyReservationListEvent } from '@fz-original/app/core/tracking/core/events/load-my-reservation-list';
import { MixpanelEvent } from '@fz-original/app/core/tracking/providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '@fz-original/app/core/tracking/providers/mixpanel/mixpanel-mapper';

export class LoadMyReservationListMapper implements MixpanelTrackingMapper<LoadMyReservationListEvent> {
  map(event: LoadMyReservationListEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation|MyList', event.data);
  }
}
