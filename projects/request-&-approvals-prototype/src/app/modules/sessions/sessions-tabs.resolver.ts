import { inject, Injectable } from '@angular/core';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';

import { OptimizelyService } from '../../shared/optimizely/optimizely.service';
import { Permissions } from '../../shared/services/user/permissions';
import { UserService } from '../../shared/services/user/user.service';
import { PriceListPermissionsService } from '../inventory/inventory-pricing/shared/services/price-list-permissions/price-list-permissions.service';
import { DynamicPricingPermissionsService } from '../inventory/shared/services/dynamic-pricing-permissions/dynamic-pricing-permissions.service';
import { SessionRoutes } from './sessions/session-routes';
import { TabOption } from './shared/models/side-tab-option.model';

const SESSION_TAB_LABEL_BY_ROUTE: Partial<Record<SessionRoutes, string>> = {
  [SessionRoutes.Calendar]: 'sessions.calendar.title',
  [SessionRoutes.CancellationHistory]: 'sessions.cancellationHistory.title',
  [SessionRoutes.DynamicPricing]: 'sessions.dynamicPricing.title',
  [SessionRoutes.DynamicPricingSimulator]: 'sessions.dynamicPricingSimulator.title',
  [SessionRoutes.PricesPerTimeslot]: 'sessions.pricesPerTimeslot.title',
  [SessionRoutes.Pricing]: 'sessions.pricing.title',
  [SessionRoutes.Rules]: 'sessions.rules.tabTitle',
  [SessionRoutes.Schedule]: 'sessions.schedule.title',
  [SessionRoutes.Seating]: 'sessions.seatingMap.title',
  [SessionRoutes.TicketsPerTimeslot]: 'sessions.sessionsPerTimeslot.title',
  [SessionRoutes.TicketTypes]: 'sessions.sessionTypes.title',
};

export interface SessionsTabsOptions {
  hasDeclarativeInventory?: boolean;
  isCalendarHidden?: boolean;
  isSeatsIoPlan?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SessionsTabsResolver {
  readonly #dynamicPricingPermissions = inject(DynamicPricingPermissionsService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #priceListPermissions = inject(PriceListPermissionsService);
  readonly #userService = inject(UserService);

  getAvailableTabs(options: SessionsTabsOptions = {}): TabOption[] {
    const canViewTimeslots = this.#userService.hasPermission(Permissions.CAN_VIEW_TIMESLOTS);
    const canViewSessionActionRules = this.#userService.hasPermission(Permissions.CAN_VIEW_SESSION_ACTION_RULES);
    const canViewTicketTypes = this.#userService.hasPermission(Permissions.CAN_VIEW_TICKET_TYPES);
    const canCancelSessions = this.#userService.hasPermission(Permissions.CAN_CANCEL_SESSIONS);
    const isPriceListsEnabled = this.#priceListPermissions.isPriceListsEnabled();
    const isDynamicPricingEnabled = this.#dynamicPricingPermissions.isDynamicPricingEnabled();

    const showCalendar = canViewTimeslots && !options.isCalendarHidden;
    const showSchedule = canViewTimeslots;
    const showTicketsPerTimeslot = canViewTimeslots;

    const isInventoryViewEnabled = this.#isFeatureEnabled(FeatureFlags.INVENTORY_VIEW);

    const showDynamicPricingTab = isDynamicPricingEnabled && !isInventoryViewEnabled;
    const showDynamicPricingSimulatorTab =
      isDynamicPricingEnabled && this.#isFeatureEnabled(FeatureFlags.ADAPTATIVE_PRICING_SIMULATOR_VIEW) && !isInventoryViewEnabled;

    const showPricingTab = isPriceListsEnabled && !isInventoryViewEnabled;
    const showSessionTypesTab = canViewTicketTypes && this.#isFeatureEnabled(FeatureFlags.TICKET_TYPES_VIEW) && !isInventoryViewEnabled;
    const showPricesPerTimeslotTab = this.#priceListPermissions.isPricesPerTimeslotEnabled();

    const showRulesTab = canViewSessionActionRules && !options.hasDeclarativeInventory;

    const showSeatingTab = canViewTimeslots && options.isSeatsIoPlan === true && !options.hasDeclarativeInventory;

    const showCancellationHistoryTab = canCancelSessions && (this.#optimizelyService.isFeatureEnabled('can_cancel_sessions') ?? false);

    const calendarTab = this.#buildTab(SessionRoutes.Calendar);
    const ticketsPerTimeslotTab = this.#buildTab(SessionRoutes.TicketsPerTimeslot);
    const seatingTab = this.#buildTab(SessionRoutes.Seating);
    const pricesPerTimeslotTab = this.#buildTab(SessionRoutes.PricesPerTimeslot);
    const scheduleTab = this.#buildTab(SessionRoutes.Schedule);
    const rulesTab = this.#buildTab(SessionRoutes.Rules);
    const sessionTypesTab = this.#buildTab(SessionRoutes.TicketTypes);
    const pricingTab = this.#buildTab(SessionRoutes.Pricing);
    const dynamicPricingTab = this.#buildTab(SessionRoutes.DynamicPricing);
    const dynamicPricingSimulatorTab = this.#buildTab(SessionRoutes.DynamicPricingSimulator);
    const cancellationHistoryTab = this.#buildTab(SessionRoutes.CancellationHistory);

    return [
      ...(showCalendar ? [calendarTab] : []),
      ...(showTicketsPerTimeslot ? [ticketsPerTimeslotTab] : []),
      ...(showSeatingTab ? [seatingTab] : []),
      ...(showPricesPerTimeslotTab ? [pricesPerTimeslotTab] : []),
      ...(showSchedule ? [scheduleTab] : []),
      ...(showRulesTab ? [rulesTab] : []),
      ...(showSessionTypesTab ? [sessionTypesTab] : []),
      ...(showPricingTab ? [pricingTab] : []),
      ...(showDynamicPricingTab ? [dynamicPricingTab] : []),
      ...(showDynamicPricingSimulatorTab ? [dynamicPricingSimulatorTab] : []),
      ...(showCancellationHistoryTab ? [cancellationHistoryTab] : []),
    ];
  }

  getFirstAvailableTabId(options: SessionsTabsOptions = {}): string {
    const availableTabs = this.getAvailableTabs(options);
    const ticketsPerTimeslotTab = availableTabs.find((tab: TabOption) => tab.id === SessionRoutes.TicketsPerTimeslot);

    if (ticketsPerTimeslotTab !== undefined) {
      return ticketsPerTimeslotTab.id;
    }

    const firstTab = availableTabs.at(0);
    return firstTab?.id ?? SessionRoutes.TicketsPerTimeslot;
  }

  hasAvailableTabs(options: SessionsTabsOptions = {}): boolean {
    return this.getAvailableTabs(options).length > 0;
  }

  #buildTab(route: SessionRoutes): TabOption {
    return {
      id: route,
      label: SESSION_TAB_LABEL_BY_ROUTE[route] ?? '',
    };
  }

  #isFeatureEnabled(featureFlag: FeatureFlags): boolean {
    return this.#optimizelyService.isFeatureEnabled(featureFlag) ?? false;
  }
}
