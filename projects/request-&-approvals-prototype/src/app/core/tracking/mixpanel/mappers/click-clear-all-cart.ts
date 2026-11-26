import { ClickClearAllCartEvent } from '../../core/events/click-clear-all-cart';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickClearAllCartMapper implements MixpanelTrackingMapper<ClickClearAllCartEvent> {
  map(event: ClickClearAllCartEvent): MixpanelEvent {
    return new MixpanelEvent('click_clear_all_cart', event.data);
  }
}
