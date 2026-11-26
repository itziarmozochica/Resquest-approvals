import { SeatingSelectorMessage } from '../seating-selector-message';

export interface SeatingSelectorInitializeMessagePayload {
  state: unknown;
  locale?: string;
}

export class SeatingSelectorInitializeMessage implements SeatingSelectorMessage<SeatingSelectorInitializeMessagePayload> {
  type = 'initialize';

  constructor(public payload: SeatingSelectorInitializeMessagePayload) {}
}
