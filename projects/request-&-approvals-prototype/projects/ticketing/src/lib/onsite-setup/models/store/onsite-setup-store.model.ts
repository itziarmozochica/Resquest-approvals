import type { OnsiteSetupsSummary } from '../onsite-setups-summary.model';

export interface OnsiteSetupStoreState {
  isLoadingSummary: boolean;
  onsiteSetupsSummary: OnsiteSetupsSummary | null;
  selectionDismissed: boolean;
  summaryError: unknown;
}

export const initialState: OnsiteSetupStoreState = {
  isLoadingSummary: false,
  onsiteSetupsSummary: null,
  selectionDismissed: false,
  summaryError: null,
};
