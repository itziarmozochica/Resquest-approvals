import { ClickGetDeliveryNoteEvent } from '../../core/events/click-get-delivery-note';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickGetDeliveryNoteMapper implements MixpanelTrackingMapper<ClickGetDeliveryNoteEvent> {
  map(event: ClickGetDeliveryNoteEvent): MixpanelEvent {
    return new MixpanelEvent('click_get_delivery_note', event.data);
  }
}
