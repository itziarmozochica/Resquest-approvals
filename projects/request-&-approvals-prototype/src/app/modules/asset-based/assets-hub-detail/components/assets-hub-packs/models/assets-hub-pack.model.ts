import { RepeatedActivityAssetPolicyET } from '../enums/repeated-activity-asset-policy.enum';
import {
  PackSchedule,
  PackScheduleEdgeApiRef,
  PackScheduleEdgeRequest,
  PackScheduleNodeApiRef,
  PackScheduleNodeRequest,
} from './pack-schedule.model';

export interface AssetsHubPackSummary {
  id: number;
  name: string;
  description: string | null;
  /** `null` until the pack has been authored or backfilled onto the node/edge model. */
  schedule: PackSchedule | null;
  repeatedActivityAssetPolicy: RepeatedActivityAssetPolicyET;
  activitiesCount: number;
  activityIds: number[];
  /**
   * The pack carries a graph this client cannot read. Distinct from `schedule: null`, which means
   * there is no graph.
   */
  isScheduleUnreadable: boolean;
}

export interface AssetsHubPackAffectedGroup {
  id: number;
  name: string;
  mainPlanId: number;
  mainPlanName: string;
}

export interface AssetsHubPack {
  id: number;
  name: string;
  description: string | null;
  schedule: PackSchedule | null;
  repeatedActivityAssetPolicy: RepeatedActivityAssetPolicyET;
  activityIds: number[];
  affectedGroups: AssetsHubPackAffectedGroup[];
  isScheduleUnreadable: boolean;
}

export type AssetsHubPackWrite = Omit<AssetsHubPack, 'id' | 'affectedGroups' | 'isScheduleUnreadable' | 'schedule'> & {
  schedule: PackSchedule;
};

export interface AssetsHubPackActivity {
  id: number;
  sequence_number: number | null;
}

export interface AssetsHubPackGraphActivity {
  id: number;
  local_id: string;
}

export interface AssetsHubPackGraphRequest {
  activities: AssetsHubPackGraphActivity[];
  description: string | null;
  name: string;
  repeated_activity_asset_policy: RepeatedActivityAssetPolicyET;
  nodes: PackScheduleNodeRequest[];
  edges: PackScheduleEdgeRequest[];
}

export type AssetsHubPackRequest = AssetsHubPackGraphRequest;

export interface AssetsHubPackActivityApiRef {
  id: number;
  name?: string;
  sequence_number?: number | null;
  local_id?: string;
}

export interface AssetsHubPackAffectedGroupApiRef {
  id: number;
  name: string;
  main_plan_id: number;
  main_plan_name: string;
}

export interface AssetsHubPackListApiResponse {
  id: number;
  name: string;
  description: string | null;
  activities: AssetsHubPackActivityApiRef[];
  nodes: PackScheduleNodeApiRef[];
  edges?: PackScheduleEdgeApiRef[] | null;
  repeated_activity_asset_policy?: string | null;
}

export interface AssetsHubPackDetailApiResponse extends AssetsHubPackListApiResponse {
  affected_groups: AssetsHubPackAffectedGroupApiRef[];
}

export interface ActivityPackMaxCapacity {
  id: number;
  max_capacity: number;
}

export interface ActivityPackMaxCapacityApiResponse {
  data: ActivityPackMaxCapacity[];
}
