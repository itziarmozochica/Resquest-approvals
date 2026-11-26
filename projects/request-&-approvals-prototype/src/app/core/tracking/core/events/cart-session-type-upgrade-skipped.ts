import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { CartSessionTypeUpgradeSkippedData } from './cart-session-type-upgrade.model';

export class CartSessionTypeUpgradeSkippedEvent extends TrackingEvent<CartSessionTypeUpgradeSkippedData> {
  constructor(readonly data: CartSessionTypeUpgradeSkippedData) {
    super(TrackingEvents.CartSessionTypeUpgradeSkipped, data);
  }
}
