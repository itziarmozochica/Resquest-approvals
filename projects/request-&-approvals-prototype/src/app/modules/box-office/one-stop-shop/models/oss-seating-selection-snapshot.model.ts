import { SeatingMapState } from '@fz-original/app/shared/models/seating-map/seating-map.model';

/**
 * Seating selection captured right before a date/timeslot change wipes it, so the seats that end up
 * dropped can still be released on the provider instead of staying held until the hold token expires.
 *
 * The release calls are captured as closures rather than read back afterwards: clearing the cart runs
 * change detection, which can re-resolve the seating-map view query to nothing before the release
 * decision is taken.
 */
export interface OssSeatingSelectionSnapshot {
  expireHoldToken: (() => void) | null;
  holdTokensBySessionId: Map<string, string>;
  releaseSeatsByReference: ((seatReferences: string[]) => void) | null;
  seatReferencesBySessionId: Map<string, string[]>;
  state: SeatingMapState | null;
}
