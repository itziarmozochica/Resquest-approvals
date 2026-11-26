import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_EXTERNAL_ITEM_UNSELECTED_TYPE = 'external-item-unselected';

export interface SeatingSelectorExternalItemUnselectedMessagePayload {
  seatLabel: string;
  seatReference: string;
  shouldHoldSeatsExternally: boolean;
  validSelection: boolean;
  holdToken?: string;
}

export type SeatingSelectorExternalItemUnselectedMessage = SeatingSelectorMessage<SeatingSelectorExternalItemUnselectedMessagePayload>;
