import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_EXTERNAL_ITEM_SELECTED_TYPE = 'external-item-selected';

export interface SeatingSelectorExternalItemSelectedMessagePayload {
  itemCount: number;
  itemPrice: number;
  seatLabel: string;
  seatReference: string;
  shouldHoldSeatsExternally: boolean;
  validSelection: boolean;
  holdToken?: string;
}

export type SeatingSelectorExternalItemSelectedMessage = SeatingSelectorMessage<SeatingSelectorExternalItemSelectedMessagePayload>;
