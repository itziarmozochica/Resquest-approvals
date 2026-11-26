import { SeatingSelectorMessage } from '../seating-selector-message';

export class SeatingSelectorRequestFinishedMessage implements SeatingSelectorMessage<unknown> {
  type = 'request-finish';
}
