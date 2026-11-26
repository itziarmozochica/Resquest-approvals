import { CartSessionTypeUpgradeAppliedEvent } from '../../core/events/cart-session-type-upgrade-applied';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CartSessionTypeUpgradeAppliedMapper implements MixpanelTrackingMapper<CartSessionTypeUpgradeAppliedEvent> {
  map(event: CartSessionTypeUpgradeAppliedEvent): MixpanelEvent {
    return new MixpanelEvent('cart_session_type_upgrade_applied', event.data);
  }
}
