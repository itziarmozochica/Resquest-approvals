import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_DELETE_ORDER_TYPE = 'delete-order';

export class SeatingSelectorDeleteOrderMessage implements SeatingSelectorMessage<void> {
  readonly type = SEATING_SELECTOR_DELETE_ORDER_TYPE;
}
