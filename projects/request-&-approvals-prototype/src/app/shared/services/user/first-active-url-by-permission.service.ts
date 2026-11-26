import { inject, Injectable, Injector } from '@angular/core';

import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { fundraisingPermissions } from './fundraising-permissions.constants';
import { Permissions } from './permissions';

type LandingRouteRule = readonly [url: string, match: (permissions: Set<string>) => boolean, isRouteEnabled?: () => boolean];

function hasAny(permissions: Set<string>, ...requiredPermissions: readonly Permissions[]): boolean {
  return requiredPermissions.some(permission => permissions.has(permission));
}

function hasContentPlanTabs(permissions: Set<string>): boolean {
  return hasAny(
    permissions,
    Permissions.CAN_VIEW_CONTENT,
    Permissions.CAN_VIEW_TAGS,
    Permissions.CAN_MANAGE_VENUES,
    Permissions.CAN_MANAGE_MAIN_PLAN_TRANSLATIONS,
  );
}

function hasInventoryTabs(permissions: Set<string>): boolean {
  return hasAny(
    permissions,
    Permissions.CAN_VIEW_TICKET_TYPES,
    Permissions.CAN_VIEW_SCHEDULE,
    Permissions.CAN_VIEW_PRICE_LISTS,
    Permissions.CAN_VIEW_DYNAMIC_PRICING_RULES,
    Permissions.CAN_MANAGE_CUSTOM_PACKS,
  );
}

function hasChannelsPermissions(permissions: Set<string>): boolean {
  return hasAny(
    permissions,
    Permissions.CAN_VIEW_CHANNEL_SETTINGS,
    Permissions.CAN_MANAGE_EVENT_FEED_VISIBILITY,
    Permissions.CAN_PUBLISH_MAIN_PLAN_IN_CHANNEL,
    Permissions.CAN_PUBLISH_SESSION_TYPE_IN_CHANNEL,
  );
}

@Injectable({
  providedIn: 'root',
})
export class FirstActiveUrlByPermissionService {
  readonly #defaultLandingRoute = '/profile';

  /**
   * Resolved through the `Injector` instead of `inject(OptimizelyService)` so that reading a feature
   * flag stays confined to the rules that need one. `UserService` depends on this service, and an
   * eager dependency would make every consumer of `UserService` provide the Optimizely SDK key.
   */
  readonly #injector = inject(Injector);

  /**
   * The third element gates a rule on the same feature flag its route guard reads, so a landing
   * route is never picked when that guard would bounce the user straight back out of it.
   */
  readonly #landingRouteRules: LandingRouteRule[] = [
    ['/home', permissions => permissions.has(Permissions.CAN_RESERVE_CART)],
    ['/kiosk', permissions => permissions.has(Permissions.CAN_VIEW_KIOSK)],
    [
      '/plans',
      permissions => hasAny(permissions, Permissions.CAN_VIEW_PLANS, Permissions.CAN_CREATE_PLANS, Permissions.CAN_MANAGE_PLAN_REVIEWS),
    ],
    ['/box-office', permissions => permissions.has(Permissions.CAN_VIEW_BOX_OFFICE)],
    [
      '/box-office/sales-summary',
      permissions => permissions.has(Permissions.CAN_VIEW_BOX_OFFICE_STATS),
      () => !this.#isFeatureEnabled(FeatureFlags.HIDE_BOX_OFFICE_STATS_VIEW),
    ],
    ['/box-office/cash-register-reports', permissions => permissions.has(Permissions.CAN_MANAGE_CASH_REGISTER_REPORTS)],
    ['/box-office/shifts-list', permissions => hasAny(permissions, Permissions.CAN_VIEW_MY_SHIFTS, Permissions.CAN_VIEW_SHIFTS)],
    ['/attendees', permissions => permissions.has(Permissions.CAN_VIEW_ATTENDEES)],
    ['/order-list', permissions => permissions.has(Permissions.CAN_VIEW_ORDERS)],
    ['/orders-bulk-reschedule', permissions => permissions.has(Permissions.CAN_BULK_RESCHEDULE_ORDERS)],
    ['/validation', permissions => permissions.has(Permissions.CAN_VIEW_VALIDATE)],
    ['/invitations', permissions => permissions.has(Permissions.CAN_VIEW_INVITATIONS)],
    ['/guestlists', permissions => permissions.has(Permissions.CAN_VIEW_GUESTLISTS)],
    ['/vip-tables', permissions => permissions.has(Permissions.CAN_VIEW_VIP_TABLE)],
    ['/my-plans/list', permissions => permissions.has(Permissions.CAN_VIEW_AFFILIATE_DASHBOARD)],
    ['/ambassador-programs/my-programs-summary', permissions => permissions.has(Permissions.CAN_VIEW_MY_AMBASSADOR_PROGRAMS)],
    ['/reservations/user-list', permissions => permissions.has(Permissions.CAN_VIEW_MY_RESERVATIONS)],
    ['/plan/detail', permissions => hasContentPlanTabs(permissions) && !permissions.has(Permissions.CAN_VIEW_VALIDATE)],
    ['/event-settings', permissions => permissions.has(Permissions.CAN_VIEW_PLAN_SETTINGS)],
    ['/bundles', permissions => permissions.has(Permissions.CAN_VIEW_BUNDLES)],
    [
      '/analytics',
      permissions =>
        hasAny(permissions, Permissions.CAN_VIEW_REPORTS, Permissions.CAN_VIEW_GLOBAL_REPORTS, Permissions.CAN_MANAGE_DASHBOARD_BUILDER),
    ],
    ['/cashless', permissions => permissions.has(Permissions.CAN_VIEW_CASHLESS)],
    ['/products', permissions => permissions.has(Permissions.CAN_MANAGE_STOCK)],
    ['/billing', permissions => permissions.has(Permissions.CAN_VIEW_FINANCE)],
    ['/inventory', permissions => hasInventoryTabs(permissions)],
    ['/reviews', permissions => permissions.has(Permissions.CAN_VIEW_REVIEWS)],
    ['/sessions', permissions => permissions.has(Permissions.CAN_VIEW_TIMESLOTS)],
    ['/sessions/rules', permissions => permissions.has(Permissions.CAN_VIEW_SESSION_ACTION_RULES)],
    ['/channels-settings', permissions => hasChannelsPermissions(permissions)],
    [
      '/reservations/leads',
      permissions => hasAny(permissions, Permissions.CAN_VIEW_LEADS, Permissions.CAN_MANAGE_LEADS),
      () => this.#isFeatureEnabled(FeatureFlags.RESERVATION_LEADS_VIEW),
    ],
    ['/reservations/list', permissions => permissions.has(Permissions.CAN_VIEW_RESERVATIONS)],
    ['/reservations/create-on-behalf', permissions => permissions.has(Permissions.CAN_RESERVE_ON_BEHALF)],
    ['/reservations/rules/list', permissions => permissions.has(Permissions.CAN_CONFIGURE_RESERVATION_RULES)],
    [
      '/reservations/deposit-settings',
      permissions => permissions.has(Permissions.CAN_MANAGE_DEPOSITS),
      () => this.#isFeatureEnabled(FeatureFlags.DEPOSITS),
    ],
    [
      '/reservations/businesses',
      permissions =>
        permissions.has(Permissions.CAN_GET_BUSINESSES) &&
        hasAny(permissions, Permissions.CAN_CREATE_BUSINESSES, Permissions.CAN_EDIT_BUSINESSES),
    ],
    ['/settings/feature-management', permissions => permissions.has(Permissions.CAN_MANAGE_PERMISSIONS)],
    ['/settings/users', permissions => permissions.has(Permissions.CAN_VIEW_USER_MANAGEMENT)],
    ['/settings/role-management', permissions => hasAny(permissions, Permissions.CAN_VIEW_ROLES, Permissions.CAN_MANAGE_ROLES)],
    ['/whitelabels', permissions => permissions.has(Permissions.CAN_VIEW_WHITELABEL)],
    ['/whitelabels/translations', permissions => permissions.has(Permissions.CAN_EDIT_WHITELABEL_TRANSLATIONS)],
    ['/guest-profiles/profiles/list', permissions => hasAny(permissions, ...fundraisingPermissions.guestProfiles)],
    ['/guest-profiles/settings', permissions => hasAny(permissions, ...fundraisingPermissions.guestProfileSettings)],
    ['/fundraising/donations', permissions => hasAny(permissions, ...fundraisingPermissions.donationPrompts)],
    [
      '/fundraising/donation-pages',
      permissions => hasAny(permissions, ...fundraisingPermissions.donationPages),
      () => this.#isFeatureEnabled(FeatureFlags.MUSEUMS_WIP_FEATURES),
    ],
    // Lowest priority: kiosk settings is the landing route only when nothing else matches.
    ['/manage-kiosks', permissions => permissions.has(Permissions.CAN_VIEW_KIOSK_SETTINGS)],
  ];

  /**
   * `isDistributorSession` does not pick a route, it removes one: a distributor's menu has no `Home`
   * (§4.9), so landing there strands it on a screen nothing links to. Dropping that rule lets the
   * rest of the precedence answer with whatever the role can actually open — no hardcoded target,
   * and nothing the route guards would bounce.
   */
  resolve(permissions: Set<string>, isDistributorSession = false): string {
    const rules = isDistributorSession
      ? this.#landingRouteRules.filter(([url]: LandingRouteRule) => url !== '/home')
      : this.#landingRouteRules;

    const landingRoute = rules.find(([, match, isRouteEnabled]: LandingRouteRule) => match(permissions) && (isRouteEnabled?.() ?? true));
    return landingRoute?.[0] ?? this.#defaultLandingRoute;
  }

  #isFeatureEnabled(featureFlag: FeatureFlags): boolean {
    return this.#injector.get(OptimizelyService).isFeatureEnabled(featureFlag) ?? false;
  }
}
