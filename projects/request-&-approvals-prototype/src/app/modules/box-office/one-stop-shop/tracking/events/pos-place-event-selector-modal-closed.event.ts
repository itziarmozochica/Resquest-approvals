import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosPlaceEventSelectorModalClosedData {
  fromEvent: string | null;
  fromPlace: string | null;
  toEvent: string | null;
  toPlace: string | null;
}

export const posPlaceEventSelectorModalClosed = defineEvent<PosPlaceEventSelectorModalClosedData>('pos.place_event_selector.modal.closed');
