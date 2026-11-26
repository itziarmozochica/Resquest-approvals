import { ClickOrderPriceListsEvent } from '../../core/events/click-order-price-lists';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickOrderPriceListsMapper implements MixpanelTrackingMapper<ClickOrderPriceListsEvent> {
  map(event: ClickOrderPriceListsEvent): MixpanelEvent {
    return new MixpanelEvent('click_order_price_lists', event.data);
  }
}
