import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { CartSessionTypeUpgradeShownData } from './cart-session-type-upgrade.model';

export class CartSessionTypeUpgradeShownEvent extends TrackingEvent<CartSessionTypeUpgradeShownData> {
  constructor(readonly data: CartSessionTypeUpgradeShownData) {
    super(TrackingEvents.CartSessionTypeUpgradeShown, data);
  }
}
