import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_RELEASE_SEATS_BY_REFERENCE_TYPE = 'release-seats-by-reference';

export interface SeatingSelectorReleaseSeatsByReferenceMessagePayload {
  seatReferences: string[];
}

export class SeatingSelectorReleaseSeatsByReferenceMessage
  implements SeatingSelectorMessage<SeatingSelectorReleaseSeatsByReferenceMessagePayload>
{
  readonly type = SEATING_SELECTOR_RELEASE_SEATS_BY_REFERENCE_TYPE;

  constructor(readonly payload: SeatingSelectorReleaseSeatsByReferenceMessagePayload) {}
}
