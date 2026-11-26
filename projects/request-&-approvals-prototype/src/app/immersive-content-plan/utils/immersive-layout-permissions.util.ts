import { Permissions } from '@fz-original/app/shared/services/user/permissions';

// The same predicate the sibling content and gallery edition tabs use. The route only asks for
// `CAN_VIEW_CONTENT`, so writing to production is gated here instead.
const EDIT_PERMISSIONS: readonly string[] = [
  Permissions.CAN_EDIT_CONTENT,
  Permissions.CAN_CREATE_PLANS,
  Permissions.CAN_MANAGE_PLAN_REVIEWS,
];

export function canEditImmersiveLayout(hasPermission: (permission: string) => boolean): boolean {
  return EDIT_PERMISSIONS.some(permission => hasPermission(permission));
}
