import { SeatingSelectorMessage } from '../seating-selector-message';

export const SEATING_SELECTOR_SESSION_STARTED = 'session-started';

export interface SeatingSelectorSessionStartedPayload {
  expiresAt: string;
  expiresInSeconds: number;
}

export type SeatingSelectorSessionStartedMessage = SeatingSelectorMessage<SeatingSelectorSessionStartedPayload>;
