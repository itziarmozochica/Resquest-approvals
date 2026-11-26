import { SeatingSelectorMessage } from '../seating-selector-message';

export class SeatingSelectorReleaseSeatsMessage implements SeatingSelectorMessage<void> {
  readonly type = 'release-seats';
  readonly payload: any = null;
}
