import { EditPriceListItemPriceEvent } from '../../core/events/edit-price-list-item-price';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class EditPriceListItemPriceMapper implements MixpanelTrackingMapper<EditPriceListItemPriceEvent> {
  map(event: EditPriceListItemPriceEvent): MixpanelEvent {
    return new MixpanelEvent('edit_price_list_item_price', event.data);
  }
}
