import { PackNodeKindET } from '../enums/pack-node-kind.enum';
import { PackScheduleViolationCodeET } from '../enums/pack-schedule-violation-code.enum';

/**
 * One booking of one activity. A pack that runs the same activity twice holds two legs with the
 * same `activityId` and different `localId`s, which is what lets the two be scheduled and assigned
 * assets independently.
 */
export interface PackLeg {
  localId: string;
  activityId: number;
}

/**
 * A step, or — once `parentLocalId` is set — a sub-group held inside one.
 *
 * `legLocalIds` names the node's **direct** legs only, so a group's own list does not repeat the
 * legs its sub-groups hold. A node's members are those legs plus the nodes naming it as parent,
 * and it is that count, not the leg count, the API's two-member minimum is about.
 */
export interface PackNode {
  localId: string;
  kind: PackNodeKindET;
  legLocalIds: string[];
  internalMinMinutes: number | null;
  internalMaxMinutes: number | null;
  startOffsetMinutes: number | null;
  /** `null` for a step the pack schedules; the holding group's id for a sub-group inside one. */
  parentLocalId: string | null;
}

/**
 * Minutes are nullable because the operator can empty either field while editing. An empty one is a
 * `WINDOW` violation that blocks the save, the same way an any-order node's internal window is,
 * rather than silently standing in for a zero-minute gap.
 */
export interface PackEdge {
  predecessorLocalId: string;
  successorLocalId: string;
  minMinutesBefore: number | null;
  maxMinutesBefore: number | null;
}

export interface PackSchedule {
  legs: PackLeg[];
  nodes: PackNode[];
  edges: PackEdge[];
}

export type PackScheduleViolationTarget =
  | { scope: 'schedule' }
  | { scope: 'node'; localId: string }
  | { scope: 'leg'; localId: string }
  | { scope: 'edge'; successorLocalId: string };

export interface PackScheduleViolation {
  code: PackScheduleViolationCodeET;
  target: PackScheduleViolationTarget;
}

/**
 * The read path renders the whole tree flattened — roots in dependency order, each followed by the
 * nodes it holds — so `parent_local_id` is the only thing that says which of them is nested.
 * Optional because a response from before `(internal repository)#52699` carries no such key.
 */
export interface PackScheduleNodeApiRef {
  local_id: string;
  kind: string;
  leg_local_ids: string[];
  internal_min_minutes: number | null;
  internal_max_minutes: number | null;
  start_offset_minutes: number | null;
  parent_local_id?: string | null;
}

export interface PackScheduleEdgeApiRef {
  predecessor_local_id: string;
  successor_local_id: string;
  min_minutes_before: number;
  max_minutes_before: number;
}

export interface PackScheduleNodeRequest {
  local_id: string;
  kind: PackNodeKindET;
  leg_local_ids: string[];
  internal_min_minutes: number | null;
  internal_max_minutes: number | null;
  start_offset_minutes: number | null;
  parent_local_id: string | null;
}

/**
 * Nullable for the same reason `PackScheduleNodeRequest`'s internal window is: the save is gated on
 * `validatePackSchedule`, so a `null` here can only mean the validator missed a defect, and a 400
 * naming it is a truer answer than a zero-minute gap nobody asked for.
 */
export interface PackScheduleEdgeRequest {
  predecessor_local_id: string;
  successor_local_id: string;
  min_minutes_before: number | null;
  max_minutes_before: number | null;
}
