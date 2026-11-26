/**
 * The graph defects the API rejects. It answers every one of them with a single 400 carrying a
 * free-text domain message, so the editor has to find them itself to point at the node or edge
 * that caused one. Named after the codes spec 4.5 reserved, minus the two the editor cannot judge:
 * `BOTH_FORMATS`, which it never sends, and `SHARED_ASSET`, which needs asset identity per activity
 * that the hub activities endpoint does not return.
 *
 * The nesting codes have no counterpart in spec 4.5, which predates sub-groups. They mirror
 * `nested_single_node`, `start_offset_on_nested_node` and the parent checks `ScheduleGraphBuilder`
 * gained in `(internal repository)#52699`.
 */
export const PackScheduleViolationCode = {
  CYCLE: 'cycle',
  DUPLICATE_LOCAL_ID: 'duplicateLocalId',
  INTERNAL_WINDOW: 'internalWindow',
  JOIN_NOT_SUPPORTED: 'joinNotSupported',
  LEG_NOT_IN_ONE_NODE: 'legNotInOneNode',
  NESTED_STEP_NOT_GROUP: 'nestedStepNotGroup',
  NODE_MEMBER_COUNT: 'nodeMemberCount',
  OFFSET_NOT_ROOT: 'offsetNotRoot',
  OFFSET_ON_NESTED: 'offsetOnNested',
  PARENT_CYCLE: 'parentCycle',
  TOO_MANY_ELEMENTS: 'tooManyElements',
  UNKNOWN_LOCAL_ID: 'unknownLocalId',
  WINDOW: 'window',
} as const;

export type PackScheduleViolationCodeET = (typeof PackScheduleViolationCode)[keyof typeof PackScheduleViolationCode];
