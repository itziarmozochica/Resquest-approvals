import type { RequestState } from '../../../core/models/request-state.model';
import type { SalesRouting } from '../sales-routing.model';

export type FetchSalesRoutingAction = 'fetchError' | 'fetchSuccess';

export type SalesRoutingAction = FetchSalesRoutingAction | null;

export interface SalesRoutingStoreState {
  error: unknown;
  isLoading: boolean;
  salesRouting: SalesRouting | null;
  salesRoutingAction: SalesRoutingAction;
  searchQuery: string;
}

export const initialState: SalesRoutingStoreState = {
  error: null,
  isLoading: false,
  salesRouting: null,
  salesRoutingAction: null,
  searchQuery: '',
};

export type SalesRoutingRequestState = RequestState;
