import { CartSessionTypeUpgradeShownEvent } from '../../core/events/cart-session-type-upgrade-shown';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CartSessionTypeUpgradeShownMapper implements MixpanelTrackingMapper<CartSessionTypeUpgradeShownEvent> {
  map(event: CartSessionTypeUpgradeShownEvent): MixpanelEvent {
    return new MixpanelEvent('cart_session_type_upgrade_sheet_shown', event.data);
  }
}
