import type { DateAvailability } from '../date-availability.model';
import type { DaySummary } from '../session-availability-summary.model';
import type { SessionSelectorType } from '../session-selector-type.enum';
import type { Session } from '../session.model';

export interface AvailabilityStoreState {
  allowMultiSessionPurchase: boolean;
  datesAvailability: Record<string, DateAvailability>;
  datesError: unknown;
  daySummaries: Record<string, DaySummary>;
  hasExplodePipe: boolean;
  isLoadingDates: boolean;
  isLoadingSessions: boolean;
  isLoadingSessionsForDate: boolean;
  nextAvailableDate: string | null;
  productSummaries: readonly Session[];
  selectedDate: string | null;
  selectedDatetime: string | null;
  sessionSelectorType: SessionSelectorType | null;
  sessionsError: unknown;
  sessionsForDateError: unknown;
  timezone: string;
}

export const initialState: AvailabilityStoreState = {
  allowMultiSessionPurchase: false,
  datesAvailability: {},
  datesError: null,
  daySummaries: {},
  hasExplodePipe: false,
  isLoadingDates: false,
  isLoadingSessions: false,
  isLoadingSessionsForDate: false,
  nextAvailableDate: null,
  productSummaries: [],
  selectedDate: null,
  selectedDatetime: null,
  sessionSelectorType: null,
  sessionsError: null,
  sessionsForDateError: null,
  timezone: '',
};
