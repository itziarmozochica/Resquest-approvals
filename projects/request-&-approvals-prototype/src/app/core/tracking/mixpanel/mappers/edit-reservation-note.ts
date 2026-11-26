import { EditReservationNoteEvent } from '../../core/events/edit-reservation-note';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class EditReservationNoteMapper implements MixpanelTrackingMapper<EditReservationNoteEvent> {
  map(event: EditReservationNoteEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation Note|Edit', event.data);
  }
}
