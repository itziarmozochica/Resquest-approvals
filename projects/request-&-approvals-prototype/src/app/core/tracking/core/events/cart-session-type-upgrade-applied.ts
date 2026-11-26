import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { CartSessionTypeUpgradeAppliedData } from './cart-session-type-upgrade.model';

export class CartSessionTypeUpgradeAppliedEvent extends TrackingEvent<CartSessionTypeUpgradeAppliedData> {
  constructor(readonly data: CartSessionTypeUpgradeAppliedData) {
    super(TrackingEvents.CartSessionTypeUpgradeApplied, data);
  }
}
