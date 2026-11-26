export type OssTicketSelectorPlaceholder = 'awaitingSelection' | 'loading' | 'noPlans' | 'noSelection';

export interface OssPlanSelectionStoreState {
  hasAvailablePlans: boolean | null;
  selectionDismissed: boolean;
}

export const initialState: OssPlanSelectionStoreState = {
  hasAvailablePlans: null,
  selectionDismissed: false,
};
