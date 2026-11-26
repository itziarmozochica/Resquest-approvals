import type { RequestState } from '../../../core/models/request-state.model';
import { retailCurrencyDictionary, type RetailCurrencyCode } from '../../../core/models/retail-currency.model';
import { retailOptions, type RetailSetupType } from '../../../core/models/retail-setup-type.model';
import type { RetailSetupAccount } from '../retail-setup/retail-setup-account.model';
import type { AvailableRetailSetup, RetailSetup, RetailSetupId } from '../retail-setup/retail-setup.model';

export type FetchRetailAction = 'fetchError' | 'fetchSuccess';
export type FetchRetailByIdAction = 'fetchByIdError' | 'fetchByIdSuccess';
type CreateRetailAction = 'createError' | 'createSuccess';
type UpdateRetailAction = 'updateError' | 'updateSuccess';
type SyncRetailAction = 'syncByPlansError' | 'syncByPlansSuccess' | 'syncError' | 'syncSuccess' | null;
export type RetailSetupAction = CreateRetailAction | FetchRetailAction | FetchRetailByIdAction | UpdateRetailAction | null;

export interface RetailSetupStoreState {
  accountsError: unknown;
  availableRetailSetups: AvailableRetailSetup[];
  error: unknown;
  isLoading: boolean;
  isLoadingAccounts: boolean;
  retailAction: RetailSetupAction;
  retailCurrencyDictionary: Partial<Record<RetailSetupType, readonly RetailCurrencyCode[]>>;
  retailSetupAccounts: RetailSetupAccount[];
  retailSetupDictionary: Record<RetailSetupId, RetailSetup>;
  retailSetupOptions: readonly RetailSetupType[];
  selectedRetailOptionType: RetailSetupType | null;
  selectedRetailSetupId: RetailSetupId | null;
  syncProductsAction: SyncRetailAction;
}

export const initialState: RetailSetupStoreState = {
  accountsError: null,
  availableRetailSetups: [],
  error: null,
  isLoading: false,
  isLoadingAccounts: false,
  retailAction: null,
  retailCurrencyDictionary,
  retailSetupAccounts: [],
  retailSetupDictionary: {},
  retailSetupOptions: retailOptions,
  selectedRetailOptionType: null,
  selectedRetailSetupId: null,
  syncProductsAction: null,
};

export type RetailSetupRequestState = RequestState;
