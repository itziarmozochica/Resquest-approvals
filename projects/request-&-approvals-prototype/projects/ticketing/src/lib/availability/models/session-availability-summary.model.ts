import type { SessionSelectorType } from './session-selector-type.enum';
import type { Session } from './session.model';

export interface TimeslotSummary {
  readonly capacity: number | null;
  readonly datetime: string;
  readonly overrideCapacity: number | null;
  readonly sessions: readonly Session[];
}

export interface DaySummary {
  readonly date: string;
  readonly timeslots: readonly TimeslotSummary[];
}

export interface SessionAvailabilitySummary {
  readonly allowMultiSessionPurchase: boolean;
  readonly daySummaries: readonly DaySummary[];
  readonly hasExplodePipe: boolean;
  readonly nextAvailableDate: string | null;
  readonly productSummaries: readonly Session[];
  readonly sessionSelectorType: SessionSelectorType | null;
  readonly timezone: string;
}
