import { DeleteReservationNoteEvent } from '../../core/events/delete-reservation-note';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class DeleteReservationNoteMapper implements MixpanelTrackingMapper<DeleteReservationNoteEvent> {
  map(event: DeleteReservationNoteEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation Note|Delete', event.data);
  }
}
