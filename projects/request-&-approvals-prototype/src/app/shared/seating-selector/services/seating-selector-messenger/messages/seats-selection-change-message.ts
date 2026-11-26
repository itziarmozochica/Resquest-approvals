import { SeatingSelectorMessage } from '../seating-selector-message';
import { SeatingSelectorSeatsSelectedMessagePayload } from './seats-selected-message';

export const SEATING_SELECTOR_SEATS_SELECTION_CHANGE_ID = 'seats-selection-change';

export type SeatingSelectorSeatsSelectionChangeMessage = SeatingSelectorMessage<SeatingSelectorSeatsSelectedMessagePayload>;
