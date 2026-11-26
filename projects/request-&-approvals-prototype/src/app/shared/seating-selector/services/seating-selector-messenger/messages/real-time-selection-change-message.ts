import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_REAL_TIME_SELECTION_CHANGE_TYPE = 'real-time-selection-change';

export interface ExternalItem {
  itemCount: number;
  itemPrice: number;
  seatLabel: string;
  seatReference: string;
}

export type RealTimeSelectionChangeReason = 'change' | 'expired';

export interface RealTimeSelection {
  holdToken: string | null;
  items: ExternalItem[];
  reason: RealTimeSelectionChangeReason;
}

export type SeatingSelectorRealTimeSelectionChangeMessage = SeatingSelectorMessage<RealTimeSelection>;
