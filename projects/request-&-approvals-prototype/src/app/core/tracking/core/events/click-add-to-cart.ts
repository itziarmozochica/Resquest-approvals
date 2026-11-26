import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ClickClearAllCartData } from './click-clear-all-cart';

export interface ClickAddToCartData extends ClickClearAllCartData {
  ticketing_flow: string;
}

export class ClickAddToCartEvent extends TrackingEvent<ClickAddToCartData> {
  constructor(readonly data: ClickAddToCartData) {
    super(TrackingEvents.ClickAddToCart, data);
  }
}
