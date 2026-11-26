import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_RELEASE_COMPLETED_TYPE = 'release-completed';

export class SeatingSelectorReleaseCompletedMessage implements SeatingSelectorMessage<void> {
  type = SEATING_SELECTOR_RELEASE_COMPLETED_TYPE;
}
