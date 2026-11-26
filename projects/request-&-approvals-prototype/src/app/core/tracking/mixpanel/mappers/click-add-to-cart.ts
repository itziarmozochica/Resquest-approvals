import { ClickAddToCartEvent } from '../../core/events/click-add-to-cart';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickAddToCartMapper implements MixpanelTrackingMapper<ClickAddToCartEvent> {
  map(event: ClickAddToCartEvent): MixpanelEvent {
    return new MixpanelEvent('click_add_to_cart', event.data);
  }
}
