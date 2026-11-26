import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_SEATS_SELECTED_ID = 'seats-selected';

export interface SeatingSelectorSeatsSelectedMessagePayload {
  feverSeatingData: any;
  seats: Array<string>;
}

export type SeatingSelectorSeatsSelectedMessage = SeatingSelectorMessage<SeatingSelectorSeatsSelectedMessagePayload>;
