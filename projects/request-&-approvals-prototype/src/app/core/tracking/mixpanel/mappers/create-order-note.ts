import { CreateOrderNoteEvent } from '../../core/events/create-order-note';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CreateOrderNoteMapper implements MixpanelTrackingMapper<CreateOrderNoteEvent> {
  map(event: CreateOrderNoteEvent): MixpanelEvent {
    return new MixpanelEvent('create_order_note', event.data);
  }
}
