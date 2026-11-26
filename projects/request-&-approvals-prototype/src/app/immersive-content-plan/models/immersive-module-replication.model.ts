import type { ImmersiveLayoutModule, ImmersiveLayoutTranslations } from './immersive-layout-document.model';
import type { ImmersiveModuleType } from './immersive-layout-module-type.model';

export type ReplicationOutcome = 'conflict' | 'error' | 'invalid' | 'layout_not_found' | 'module_not_found' | 'storage_error' | 'updated';

export type ReplicationGroup = 'failed' | 'skipped' | 'updated';

export interface ReplicationItemError {
  key?: string;
  locale?: string;
  message?: string;
  path?: string;
}

export interface ReplicationResultItem {
  outcome: ReplicationOutcome;
  plan_id: number;
  detail?: string;
  errors?: ReplicationItemError[];
}

export interface ReplicationResponse {
  module_id: string;
  results: ReplicationResultItem[];
  updated_at: string;
}

export interface ReplicationRequestBody {
  module: ImmersiveLayoutModule;
  plan_ids: number[];
  translations: ImmersiveLayoutTranslations;
  channel_id?: string;
}

export interface GroupedReplicationOutcome {
  group: ReplicationGroup;
  items: ReplicationResultItem[];
}

export interface ReplicationModuleCandidate {
  changed: boolean;
  hasMediaRisk: boolean;
  id: string;
  label: string;
  type: ImmersiveModuleType;
}

export interface ReplicationSource {
  availableLanguages: string[];
  layoutModules: ImmersiveLayoutModule[];
  modules: ReplicationModuleCandidate[];
  partnerId: number;
  planId: number;
  translations: ImmersiveLayoutTranslations;
}

export interface ParsedPlanIds {
  droppedSourceId: boolean;
  duplicateCount: number;
  ids: number[];
  invalidTokens: string[];
  overflowCount: number;
}
