import { ConfirmEditPriceEvent } from '../../core/events/confirm-edit-price';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmEditPriceMapper implements MixpanelTrackingMapper<ConfirmEditPriceEvent> {
  map(event: ConfirmEditPriceEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_edit_price', event.data);
  }
}
