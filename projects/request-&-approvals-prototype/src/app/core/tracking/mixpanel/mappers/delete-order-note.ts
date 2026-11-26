import { DeleteOrderNoteEvent } from '../../core/events/delete-order-note';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class DeleteOrderNoteMapper implements MixpanelTrackingMapper<DeleteOrderNoteEvent> {
  map(event: DeleteOrderNoteEvent): MixpanelEvent {
    return new MixpanelEvent('delete_order_note', event.data);
  }
}
