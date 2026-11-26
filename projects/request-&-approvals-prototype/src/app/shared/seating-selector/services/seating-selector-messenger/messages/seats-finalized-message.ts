import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_FINALIZED_MESSAGE_TYPE = 'finalized';

export interface SeatingSelectorSeatsFinishedMessagePayload {
  token: string;
}

export type SeatingSelectorSeatsFinalizedMessage = SeatingSelectorMessage<SeatingSelectorSeatsFinishedMessagePayload>;
