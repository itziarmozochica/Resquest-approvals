import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_SEAT_REMOVED_TYPE = 'seat-removed';

export interface SeatingSelectorSeatsRemovedMessagePayload {
  sessionId: number;
  seatReference: string;
  validSelection: boolean;
}

export type SeatingSelectorSeatsRemovedMessage = SeatingSelectorMessage<SeatingSelectorSeatsRemovedMessagePayload>;
