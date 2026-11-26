import { CreateReservationNoteEvent } from '../../core/events/create-reservation-note';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CreateReservationNoteMapper implements MixpanelTrackingMapper<CreateReservationNoteEvent> {
  map(event: CreateReservationNoteEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation Note|Create', event.data);
  }
}
