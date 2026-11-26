import type { LayoutPersistIntent } from '../../utils/immersive-layout-persist-gate.util';
import type {
  GroupedReplicationOutcome,
  ReplicationItemError,
  ReplicationResultItem,
  ReplicationSource,
} from '../immersive-module-replication.model';

export type ReplicationStep = 'form' | 'run';

// The publish that precedes the replication, as the dialog observed it on the content-plan store.
export type PublishStatus = 'done' | 'error' | 'idle' | 'inProgress';

// The two rows of the run step's status list; `pending` only ever applies to the apply row.
export type ReplicationRowStatus = 'done' | 'error' | 'inProgress' | 'pending';

// `forbidden` is a 403 (stops the batch), `notSent` a module the batch never reached, `error` anything else.
export type ModuleReplicationStatus = 'done' | 'error' | 'forbidden' | 'notSent' | 'pending' | 'sending';

// What the actions bar hands over through `IGNT_DIALOG_DATA`: nothing has been written yet, so the
// dialog is the one that persists, with the intent the user confirmed.
export interface ImmersiveModuleReplicationDialogData {
  intent: LayoutPersistIntent;
}

export interface ModuleReplicationJob {
  moduleId: string;
  planIds: number[];
}

// Why a module-level request failed: the message to show and, for a 422, what the backend listed.
export interface ModuleReplicationFailure {
  errors: ReplicationItemError[];
  messageKey: string;
}

export interface ModuleReplicationState {
  // The plan ids requested for this module: a response can never widen them, and a retry of a
  // module that failed as a whole resends them.
  planIds: number[];
  results: ReplicationResultItem[];
  status: ModuleReplicationStatus;
  // Set only while the module is in `error`; cleared as soon as it is sent again.
  failure?: ModuleReplicationFailure;
}

export interface ModuleResultsGroup {
  // One formatted line per error the backend listed for a module that failed as a whole.
  details: string[];
  groups: GroupedReplicationOutcome[];
  label: string;
  moduleId: string;
  status: ModuleReplicationStatus;
  messageKey?: string;
}

export interface ReplicationStatusRow {
  id: 'apply' | 'publish';
  labelKey: string;
  params: Record<string, number | string>;
  status: ReplicationRowStatus;
  messageKey?: string;
}

export interface ImmersiveModuleReplicationStoreState {
  isMediaRiskAcknowledged: boolean;
  // Keyed by module id; only the modules of the batch that ran.
  modules: Record<string, ModuleReplicationState>;
  planIdsInput: string;
  publishStatus: PublishStatus;
  selectedModuleIds: string[];
  source: ReplicationSource | null;
  step: ReplicationStep;
}

export const initialState: ImmersiveModuleReplicationStoreState = {
  isMediaRiskAcknowledged: false,
  modules: {},
  planIdsInput: '',
  publishStatus: 'idle',
  selectedModuleIds: [],
  source: null,
  step: 'form',
};
