import type { RequestState } from '@fz-shop-products/src/lib/core/models/request-state.model';

import type { OnsiteSetupsSummaryDTO } from '../../../shared/models/onsite-setups-summary.model';

export type TicketSelectorPlaceholder = 'loading' | 'noSelection' | 'noSetups';

export interface OssOnsiteSetupStoreState extends RequestState {
  onsiteSetupsSummary: OnsiteSetupsSummaryDTO | null;
  selectionDismissed: boolean;
}

export const initialState: OssOnsiteSetupStoreState = {
  error: null,
  isLoading: false,
  onsiteSetupsSummary: null,
  selectionDismissed: false,
};
