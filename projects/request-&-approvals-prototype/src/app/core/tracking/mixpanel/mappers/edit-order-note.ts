import { EditOrderNoteEvent } from '../../core/events/edit-order-note';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class EditOrderNoteMapper implements MixpanelTrackingMapper<EditOrderNoteEvent> {
  map(event: EditOrderNoteEvent): MixpanelEvent {
    return new MixpanelEvent('edit_order_note', event.data);
  }
}
