import type { SeatingProviderEnum } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';

/** The map context the POS publishes: it always lists the current plan's session ids, empty when the cart holds none. */
export interface OboSecondScreenSeatingMap {
  provider?: SeatingProviderEnum;
  sessionIds: number[];
}

/**
 * The map context as the second screen reads it back from storage. A POS tab built before the session ids
 * were published stores it without them; the second screen then takes the session ids from the cart lines.
 */
export interface OboSecondScreenStoredSeatingMap {
  provider?: SeatingProviderEnum;
  sessionIds?: number[];
}
