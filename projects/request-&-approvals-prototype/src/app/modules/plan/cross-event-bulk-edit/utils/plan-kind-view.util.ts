import { PLAN_KIND_PERMISSIONS } from '@fz-original/app/shared/models/plan/plan-kind-permissions.config';
import { PlanKind } from '@fz-original/app/shared/models/plan/plan-kind.enum';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';

export function filterPlansByKindViewPermission<PlanWithKind extends { kind?: PlanKind }>(
  plans: readonly PlanWithKind[],
  hasPermission: (permission: Permissions) => boolean,
): PlanWithKind[] {
  return plans.filter(plan => isPlanKindViewAllowed(plan.kind, hasPermission));
}

function isPlanKindViewAllowed(kind: PlanKind | undefined, hasPermission: (permission: Permissions) => boolean): boolean {
  const requiredPermission = kind === undefined ? undefined : PLAN_KIND_PERMISSIONS[kind]?.view;
  return requiredPermission === undefined || hasPermission(requiredPermission) || hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS);
}
