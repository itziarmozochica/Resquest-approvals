import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_CART_ERROR_TYPE = 'cart-error';

export class SeatingSelectorCartErrorMessage implements SeatingSelectorMessage<void> {
  readonly type = SEATING_SELECTOR_CART_ERROR_TYPE;
}
