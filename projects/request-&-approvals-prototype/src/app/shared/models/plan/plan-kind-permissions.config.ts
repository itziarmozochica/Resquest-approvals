import { Permissions } from '../../services/user/permissions';
import { PlanKind } from './plan-kind.enum';

interface PlanKindPermissions {
  view: Permissions;
  edit?: Permissions;
}

export const PLAN_KIND_PERMISSIONS: Partial<Record<PlanKind, PlanKindPermissions>> = {
  [PlanKind.AUCTION]: {
    edit: Permissions.CAN_MANAGE_AUCTIONS,
    view: Permissions.CAN_VIEW_AUCTIONS,
  },
  [PlanKind.LINK_OUT]: {
    edit: Permissions.CAN_MANAGE_LINK_OUTS,
    view: Permissions.CAN_VIEW_LINK_OUTS,
  },
  [PlanKind.PRIZE_DRAW]: {
    edit: Permissions.CAN_MANAGE_PRIZE_DRAWS,
    view: Permissions.CAN_VIEW_PRIZE_DRAWS,
  },
  [PlanKind.REDEEM_NOW]: {
    edit: Permissions.CAN_MANAGE_REDEEM_NOW,
    view: Permissions.CAN_VIEW_REDEEM_NOW,
  },
  [PlanKind.SHOWCASE]: {
    edit: Permissions.CAN_MANAGE_SHOWCASE,
    view: Permissions.CAN_VIEW_SHOWCASE,
  },
  [PlanKind.WAITLIST]: {
    view: Permissions.CAN_VIEW_WAITLISTS,
  },
};
