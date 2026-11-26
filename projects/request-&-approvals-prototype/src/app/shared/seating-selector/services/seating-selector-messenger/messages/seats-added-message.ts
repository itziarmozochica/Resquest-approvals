import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_SEAT_ADDED_TYPE = 'seat-added';

export interface SeatingSelectorSeatsAddedMessagePayload {
  holdToken?: string;
  seatLabel: string;
  displayedLabel?: string;
  seatReference: string;
  sessionId: number;
  validSelection: boolean;
}

export type SeatingSelectorSeatsAddedMessage = SeatingSelectorMessage<SeatingSelectorSeatsAddedMessagePayload>;
