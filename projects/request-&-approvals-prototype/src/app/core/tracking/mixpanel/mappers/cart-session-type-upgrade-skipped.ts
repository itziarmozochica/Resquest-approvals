import { CartSessionTypeUpgradeSkippedEvent } from '../../core/events/cart-session-type-upgrade-skipped';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CartSessionTypeUpgradeSkippedMapper implements MixpanelTrackingMapper<CartSessionTypeUpgradeSkippedEvent> {
  map(event: CartSessionTypeUpgradeSkippedEvent): MixpanelEvent {
    return new MixpanelEvent('cart_session_type_upgrade_skipped', event.data);
  }
}
