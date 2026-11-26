import { SessionTypeCatalogItem } from '../../../../shared/services/sessions/session-type-catalog.model';
import { CreateBatchResult } from '../create-batch-result.model';
import { RequirementError } from '../requirement-error.model';

export type ListAction = 'loadError' | 'loadSuccess';
export type MutationAction = 'batchDone' | 'mutationError' | 'toggleSuccess' | 'updateSuccess';
export type ListState = 'error' | 'idle' | 'loaded' | 'loading';

export interface AgreementRequirementsState {
  readonly error: unknown;
  readonly hasLoaded: boolean;
  readonly isLoading: boolean;
  readonly isLoadingTicketTypes: boolean;
  readonly lastBatchResult: CreateBatchResult | null;
  readonly lastMutationError: RequirementError | null;
  readonly listAction: ListAction | null;
  readonly mutationAction: MutationAction | null;
  readonly pendingMutations: number;
  readonly planId: number | null;
  readonly ticketTypes: SessionTypeCatalogItem[];
  readonly ticketTypesError: unknown;
  readonly togglingIds: number[];
}

export const initialState: AgreementRequirementsState = {
  error: null,
  hasLoaded: false,
  isLoading: false,
  isLoadingTicketTypes: false,
  lastBatchResult: null,
  lastMutationError: null,
  listAction: null,
  mutationAction: null,
  pendingMutations: 0,
  planId: null,
  ticketTypes: [],
  ticketTypesError: null,
  togglingIds: [],
};
