import { InformationRequest } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request.model';
import { MAIN_EVENT_REQUEST_TEMPLATE_KEY } from '@fz-original/app/modules/ir-approval/information-requests/models/main-event-stepper-template';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

export function canCreatePlanFromRequest(request: InformationRequest, userService: UserService): boolean {
  return request.canCreateMainPlan || userService.hasPermission(Permissions.CAN_CREATE_PLANS);
}

export function canResumeRequestPlan(request: InformationRequest, userService: UserService): boolean {
  return request.canResumeQuickSetup || userService.hasPermission(Permissions.CAN_CREATE_PLANS);
}

/**
 * Whether the user can actually land on `/plans/dashboard`.
 *
 * `plans/dashboard` is not one route but two siblings (`plan-routing.module.ts`), and the URL is served by
 * whichever of them matches — so this affordance has to cover both, not only the legacy one:
 * - the **360 analytics** sibling, gated on `can_view_reports` alone via `canMatchViewReportsGuard`;
 * - the **legacy** `PlanDashboardComponent`, gated on any-of `['can_view_plans', 'can_create_plans',
 *   'can_manage_plan_reviews']`.
 *
 * Both sit behind the `/plans` mount guard (`private-routes.ts`), whose any-of is `['can_view_plans',
 * 'can_view_content', 'can_create_plans', 'can_manage_plan_reviews']` — `can_view_reports` is **not** in it.
 * So `can_view_reports` on its own reaches neither sibling: the mount bounces it to
 * `getFirstActiveUrlByPermission()`, and offering the redirect would strand exactly the user it meant to help.
 * What the 360 sibling adds over the legacy permission list is therefore precisely one profile —
 * `can_view_content` (which clears the mount and is then bounced by the legacy route) held *together with*
 * `can_view_reports` (which the 360 `canMatch` accepts). That is the composed reports-analyst profile the long
 * comment above those two routes describes, hence the compound term below rather than a bare `can_view_reports`.
 *
 * `SidebarComponent#showPlansList` encodes the legacy three and nothing more; this stays the
 * project-management copy of that decision rather than a shared helper, on purpose — what that nav item points
 * at is the plans *list*, not this two-route dashboard, so the predicates are only superficially alike
 * (refactoring the sidebar onto this is out of scope).
 *
 * This stays a routing affordance, not the enforcement point: access is enforced by the mount guard, the two
 * route gates and, for the plan itself, by the partner-scoped `planService.getPlan` call in
 * `PlanDashboardResolver`. Two gates it deliberately does not model, both asynchronous and plan-scoped where
 * this is synchronous and permission-only: `canMatchDashboardPlanKindGuard`, which routes a **draft** plan —
 * what a freshly completed quick setup is — to the legacy sibling, so the analyst profile only truly lands on
 * the 360 once the plan is published; and the mount's `PlanKindViewGuard`.
 */
export function canOpenPlanDashboard(userService: UserService): boolean {
  return (
    userService.hasPermission(Permissions.CAN_VIEW_PLANS) ||
    userService.hasPermission(Permissions.CAN_CREATE_PLANS) ||
    userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS) ||
    (userService.hasPermission(Permissions.CAN_VIEW_REPORTS) && userService.hasPermission(Permissions.CAN_VIEW_CONTENT))
  );
}

// TODO: OPX-2912 remove the templateKey fallback once BE1 ships quick_setup_enabled on the IR payload.
export function isQuickSetupInformationRequest(request: InformationRequest): boolean {
  return request.quickSetupEnabled || request.templateKey === MAIN_EVENT_REQUEST_TEMPLATE_KEY;
}
