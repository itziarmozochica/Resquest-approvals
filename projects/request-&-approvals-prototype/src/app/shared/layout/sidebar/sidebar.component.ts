import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  HostBinding,
  HostListener,
  inject,
  OnInit,
  Output,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Params, Router } from '@angular/router';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { ShiftReminderLogoutService } from '@fz-original/app/core/authentication/shift-reminder-logout.service';
import { ClickCashRegisterReportsEvent } from '@fz-original/app/core/tracking/core/events/click-cash-register-reports';
import { MEMBERSHIP_CONNECT_WIP_COPY } from '@fz-original/app/memberships/connect/membership-connect-wip-copy.const';
import { OboSecondScreenDataService } from '@fz-original/app/modules/box-office/obo-second-screen/services/obo-second-screen-data.service';
import { OboFlowTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { ContentPlanTabsResolver } from '@fz-original/app/modules/content-plan/content-plan-tabs.resolver';
import { hasBankAccountPermission } from '@fz-original/app/modules/finance/bank-account/utils/bank-account-access.util';
import { FundraisingTerminology } from '@fz-original/app/modules/fundraising/shared/services/fundraising-terminology/fundraising-terminology.service';
import { PriceListPermissionsService } from '@fz-original/app/modules/inventory/inventory-pricing/shared/services/price-list-permissions/price-list-permissions.service';
import { DynamicPricingPermissionsService } from '@fz-original/app/modules/inventory/shared/services/dynamic-pricing-permissions/dynamic-pricing-permissions.service';
import { SchedulePermissionsService } from '@fz-original/app/modules/inventory/shared/services/schedule-permissions/schedule-permissions.service';
import { PlanStateService } from '@fz-original/app/modules/reservation/services/plan-state.service';
import { ReservationBusinessChooseStateService } from '@fz-original/app/modules/reservation/services/reservation-state.service';
import { ReservationTrackingService } from '@fz-original/app/modules/reservation/services/reservation-tracking.service';
import { SessionsTabsResolver } from '@fz-original/app/modules/sessions/sessions-tabs.resolver';
import { BusinessTypeEnum } from '@fz-original/app/modules/settings/shared/models/business-type.enum';
import { TOGGLE_SIDEBAR_EVENT_KEY } from '@fz-original/app/shared/layout/sidebar/toggle-sidebar-event-key';
import { toLogoutMenuEntry } from '@fz-original/app/shared/layout/utils/logout-menu-entry.util';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { EntryPointClientService } from '@fz-original/app/shared/services/entry-point-client/entry-point-client.service';
import { OrganizationPreferencesService } from '@fz-original/app/shared/services/organization-preferences/organization-preferences.service';
import { TasksPermissionsService } from '@fz-original/app/shared/services/tasks-permissions/tasks-permissions.service';
import { assetBasedPermissions } from '@fz-original/app/shared/services/user/asset-based-permissions.constants';
import { fundraisingPermissions } from '@fz-original/app/shared/services/user/fundraising-permissions.constants';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { isAnalyticsReportingSection } from '@fz-original/app/shared/utils/analytics-breadcrumb.util';
import { SALES_ROUTING_PERMISSIONS, SHOP_PRODUCT_PERMISSIONS } from '@fz-shop-products/src/lib/core/permissions/permission';
import { IgntDialogRef, IgntDialogService } from '@ignite/common';
// eslint-disable-next-line no-restricted-imports -- Legacy fallback until S13 (B2BP-1722) retires the ng-bootstrap stack.
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, EMPTY, fromEvent, identity, Observable, OperatorFunction, Subscription } from 'rxjs';
import { expand, filter, map, reduce } from 'rxjs/operators';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { ClickBoxOfficeEvent } from '../../../core/tracking/core/events/click-box-office';
import { ClickBusinessesEvent } from '../../../core/tracking/core/events/click-businesses';
import { ClickGoToMakeNewReservationEvent } from '../../../core/tracking/core/events/click-go-to-make-new-reservation';
import { ClickNotificationsEvent } from '../../../core/tracking/core/events/click-notifications';
import { ClickOrdersEvent } from '../../../core/tracking/core/events/click-orders';
import { ClickOrdersBulkRescheduleEvent } from '../../../core/tracking/core/events/click-orders-bulk-reschedule';
import { ClickReportsEvent } from '../../../core/tracking/core/events/click-reports';
import { ClickResellersEvent } from '../../../core/tracking/core/events/click-resellers';
import { ClickReservationsEvent } from '../../../core/tracking/core/events/click-reservations';
import { ClickSalesSummaryEvent } from '../../../core/tracking/core/events/click-sales-summary';
import { ClickSettingsEvent } from '../../../core/tracking/core/events/click-settings';
import { ClickUserReservationsEvent } from '../../../core/tracking/core/events/click-user-reservations';
import { ClickWhitelabelList } from '../../../core/tracking/core/events/click-whitelabel-list';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { ClickGoToMakeNewReservationSourceEnum } from '../../../modules/reservation/models/click-go-to-make-new-reservation-source.enum';
import { SelectOrganizationDialogData } from '../../../modules/user/models/select-organization-dialog-data.model';
import { SelectOrganizationComponent } from '../../../modules/user/select-organization/select-organization.component';
import { WhitelabelAccessService } from '../../../modules/whitelabel-management/services/whitelabel-access.service';
import { LinkPaginationResponse } from '../../models/link-pagination-response';
import type { OrganizationSummary } from '../../models/organization/organization-summary.model';
import { Organization } from '../../models/organization/organization.model';
import { Partner } from '../../models/partner/partner.model';
import { DASHBOARD_PLAN_STATUSES } from '../../models/plan/dashboard-plan-statuses.constant';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { SelectedPlanContext } from '../../services/__data__/selected-plan-context.model';
import {
  BusinessAsOrganizationFlagService,
  PILOT_BUSINESS_ORGANIZATIONS_PAGE_SIZE,
} from '../../services/distributor/business-as-organization-flag.service';
import { DistributorSessionStore } from '../../services/distributor/distributor-session.store';
import { ReservationContextService } from '../../services/distributor/reservation-context.service';
import { DualScreenStorageService } from '../../services/dual-screen/dual-screen-storage.service';
import { LandingTargetService } from '../../services/landing-target/landing-target.service';
import { PartnerConfigService } from '../../services/partner-config/partner-config.service';
import { PartnerExternalIdsService } from '../../services/partner/partner-external-ids.service';
import { PartnerService } from '../../services/partner/partner.service';
import { SelectedPlanContextService } from '../../services/selected-plan-context/selected-plan-context.service';
import { UserService } from '../../services/user/user.service';
import { canAccessBookingTags } from '../../tags/utils/booking-tags-access.util';
import { hideBusinessPartnerOrganizations } from '../../utils/hide-business-partner-organizations.util';
import { SpinnerService } from '../spinner/spinner.service';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  styleUrls: ['../../../../theme/components/navigation/aside-menu/sidebar.scss'],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit {
  static readonly businessSupportRoute = '/support/business-email';
  readonly #authenticationService = inject(AuthenticationService);
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #contentPlanTabsResolver = inject(ContentPlanTabsResolver);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #document = inject(DOCUMENT);
  readonly #distributorSession = inject(DistributorSessionStore);
  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #entryPointClientService = inject(EntryPointClientService);
  readonly #modalService = inject(NgbModal);
  readonly #organizationPreferencesService = inject(OrganizationPreferencesService);
  readonly #oboSecondScreenDataService = inject(OboSecondScreenDataService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #businessAsOrganizationFlag = inject(BusinessAsOrganizationFlagService);
  readonly #optimizelyService = inject(OptimizelyService);
  #hiddenOrganizations: Organization[] = [];
  #listRequestId = 0;
  #organizationDialog?: IgntDialogRef<number>;
  readonly #organizationDialogOrganizations = signal<Organization[]>([]);
  readonly #organizationDialogLoading = signal(false);
  readonly #partnerConfigService = inject(PartnerConfigService);
  readonly #partnerExternalIdsService = inject(PartnerExternalIdsService);
  readonly #landingTargetService = inject(LandingTargetService);
  readonly #partnerService = inject(PartnerService);
  readonly #planStateService = inject(PlanStateService);
  readonly #dynamicPricingPermissions = inject(DynamicPricingPermissionsService);
  readonly #priceListPermissions = inject(PriceListPermissionsService);
  readonly #schedulePermissions = inject(SchedulePermissionsService);
  readonly #reservationBusinessChooseService = inject(ReservationBusinessChooseStateService);
  readonly #reservationTrackingService = inject(ReservationTrackingService);
  readonly #router = inject(Router);
  readonly #selectedPlanContextService = inject(SelectedPlanContextService);
  readonly #sessionsTabsResolver = inject(SessionsTabsResolver);
  readonly #shiftReminderLogoutService = inject(ShiftReminderLogoutService);
  readonly #spinnerService = inject(SpinnerService);
  readonly #tasksPermissions = inject(TasksPermissionsService);
  readonly #terminology = inject(FundraisingTerminology);
  readonly #trackingService = inject(TrackingService);
  readonly #translate = inject(TranslateService);
  readonly #userService = inject(UserService);
  readonly #reservationContext = inject(ReservationContextService);
  readonly #whitelabelAccessService = inject(WhitelabelAccessService);

  /**
   * `PartnerConfigService` only fills `contactLink` from `init(partnerId)`, which `PartnerLoaderService`
   * calls once a partner is loaded — so it is still `''` for a distributor that has not picked one yet,
   * which is exactly the screen this menu opens on. `MenuItemComponent` renders an empty link as an
   * anchor with no `href` and no `routerLink`, i.e. a dead entry, so fall back to the same business
   * support route that `#setContactLink()` would have chosen.
   */
  readonly contactLink = computed(() => this.#partnerConfigService.contactLink() || SidebarComponent.businessSupportRoute);

  readonly showDistributorMenu = computed(
    () => this.#distributorSession.isDistributorSession() && this.#businessAsOrganizationFlag.isEnabled(),
  );

  activeMenu = '';
  canManageSelectedPlan = true;
  canViewSelectedPlan = true;
  expandedItems: string[] = [];
  readonly FeatureFlags = FeatureFlags;
  hasShiftListPermissions = false;
  hideBoxOfficeStats = false;
  initialItemsPerPage = 10;
  initialPage = 1;
  @HostBinding('class.active') isActive = false;
  isDualScreen = false;
  isLoadingOrganizations = false;
  static readonly defaultStickyBreakpoint = 1199;
  static readonly editorStickyBreakpoint = 1599;
  static readonly overlayOpenClass = 'sidebar-overlay-open';

  isOneStopShopMode = false;
  isShiftRouteActive = false;
  isSticky = false;
  #unpinnedForTheRoute = false;
  nextItemsPerPage: number = this.initialItemsPerPage;
  nextPage?: number;
  @Output() oneStopShopModeChange: EventEmitter<boolean> = new EventEmitter<boolean>();
  ordersBulkRescheduleView = false;
  organizations: Organization[] = [];
  page = 1;
  partner: Partner | null = this.getPartner();
  partnerGetSubscription?: Subscription;
  readonly permissions = Permissions;
  permissionsLoaded = false;
  queryParamsMap = new Map<string, Observable<SelectedPlanContext>>();
  /**
   * Partial context is forwarded as-is, but only the pair carries the event across: the 360 filter bar
   * derives its plan options from the selected cities, so an event sent without one is dropped by its
   * own funnel and replaced by the last stored selection. Tracked apart from PRD-4728, which is about
   * the context this link reads rather than what the bar does with it.
   */
  readonly newDashboardQueryParams$: Observable<Params> = this.#selectedPlanContextService.observeContextChanges().pipe(
    map(({ channelId, cityId, planId }) => ({
      ...(channelId != null && { channelId }),
      ...(cityId != null && { cityIds: `${cityId}` }),
      ...(planId != null && { planIds: `${planId}`, statuses: DASHBOARD_PLAN_STATUSES }),
    })),
  );
  searchParam?: string;
  showAgreements = false;
  showB2bPublishing = false;
  showAgreementsModule = false;
  showAnalyticsMenuItem = false;
  showExternalCodes = false;
  showAmbassadors = false;
  showAssetCalendarListView = false;
  showBookingAgents = false;
  showBoxOfficeSection = false;
  showBranding = false;
  showBulkPartialRefunds = false;
  showBundlesView = false;
  showMarketingSection = false;
  showCashless = false;
  showOnsiteAppearance = false;
  showPartnerTags = false;
  showCoupons = false;
  canViewChannelSettings = false;
  showDeleted = false;
  showFaqSets = false;
  showDeposits = false;
  showEvents = true;
  showEventSettings = false;
  showFundraising = false;
  showPipeline = false;
  showGuestProfiles = false;
  showInventoryView = false;
  isInventoryAvailableForSelectedPlan = true;
  showLandings = false;
  showLeads = false;
  showMarketing = false;
  showEntitlements = false;
  showGuestlists = false;
  showVipTables = false;
  showMemberships = false;
  showOrderBulkReschedule = false;
  showOrderList = false;
  showOrderListEntry = false;
  showOrdersSection = false;
  showHistoricalSalesImportTool = false;
  showOtpConfigurations: boolean =
    this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.OTP_CONFIGURATIONS_VIEW,
      team: 'data-marketing',
    }) ?? false;
  showPixelTracking = false;
  showAdsManager = false;
  readonly showCrmCampaigns = signal(false);
  readonly showPricingExperiments = signal(false);
  readonly showPricingIntelligence = signal(false);
  readonly showPricingRecommender = signal(false);
  showCommunications = false;
  showCommunicationsMenuItem = false;
  showReservationsSection = false;
  showRetail = false;
  showPlansList = false;
  showSalesRouting = false;
  showScheduleAndTickets = false;
  showCancellationHistory = false;
  showContent = false;
  hasManagePartnerTransportProviders = false;
  hasManagePermissions = false;
  hasManageTransportProviders = false;
  showRoleManagement = false;
  showSettings = false;
  showUserManagement = false;
  showProjectManagementEntry = false;
  showAdminProjectManagementSettings = false;
  showShiftsList = true;
  showTransportConfiguration = false;
  showWhitelistAddress = false;
  showWinnerSelection = false;
  canAccessTasks = false;
  @Output() toggleSidebarEmitter: EventEmitter<boolean> = new EventEmitter<boolean>();
  totalOrganizations = 0;
  userId?: number;
  venuesManagementView = false;
  countriesManagementView = false;
  citiesManagementView = false;
  showAuditReportTool = false;
  showBankAccount = false;
  showBillingPeriods = false;
  showFinanceMenu = false;
  showInvoices = false;
  showPaymentCollectors = false;
  showMuseumsWipFeatures = false;
  protected readonly assetBasedPermissions = assetBasedPermissions;
  protected readonly fundraisingPermissions = fundraisingPermissions;
  protected readonly leadsPermissions = [Permissions.CAN_VIEW_LEADS, Permissions.CAN_MANAGE_LEADS];
  protected readonly odooFnbRoute = '/box-office/odoo-food-and-beverage';
  protected salesRoutingPermissions = SALES_ROUTING_PERMISSIONS;
  protected shopProductPermissions = SHOP_PRODUCT_PERMISSIONS;
  protected readonly logoutMenuEntry = computed(() => toLogoutMenuEntry(this.#entryPointClientService.entryPointClient()));
  readonly #showAutoDiagnose: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly showAutoDiagnose: Signal<boolean> = this.#showAutoDiagnose.asReadonly();
  protected showOdooPos = false;

  constructor() {
    this.isDualScreen = this.#dualScreenStorageService.containsData();
    this.#destroyRef.onDestroy(() => this.#document.documentElement.classList.remove(SidebarComponent.overlayOpenClass));
    this.#destroyRef.onDestroy(() => this.#organizationDialog?.close());
    this.#terminology.initialize();
  }

  get assetCalendarLink(): string {
    if (this.showAssetCalendarListView) {
      return '/asset-based/calendar-list';
    } else {
      return '/asset-based/calendar';
    }
  }

  checkDefaultSidebarStatus(): void {
    if (this.isOneStopShopMode) {
      this.isActive = false;
    } else {
      this.isActive = this.isSticky;
    }
    this.#emitSidebarState();
  }

  readonly membershipConnectionsLabel = MEMBERSHIP_CONNECT_WIP_COPY.connections.menuLabel;

  get dashboardMenuLink(): string {
    return '/plans/dashboard';
  }

  get dashboardMenuQueryParams$(): Observable<Params> | undefined {
    return this.#userService.hasPermission(Permissions.CAN_VIEW_REPORTS)
      ? this.newDashboardQueryParams$
      : this.queryParamsMap.get('/plans/dashboard');
  }

  getPartner(): Partner | null {
    return this.#partnerService.getPartner();
  }

  get guestProfilesMenuLabel(): string {
    return this.#terminology.resolve('menu.guestProfiles');
  }

  handleAnalyticsEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickReportsEvent({ time: new Date().toISOString() }));
  }

  handleBoxOfficeEvent(): void {
    this.toggle();
    this.#trackingService.track(
      new ClickBoxOfficeEvent({
        time: new Date().toISOString(),
      }),
    );
  }

  handleBusinessesEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickBusinessesEvent());
  }

  handleCashRegisterReportsEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickCashRegisterReportsEvent());
  }

  handleEntitlementsListEvent(): void {
    this.toggle();
  }

  handleFeatureManagementEvent(): void {
    this.toggle();
  }

  handleMembershipProgrammesEvent(): void {
    this.toggle();
  }

  handleMembershipTiersEvent(): void {
    this.toggle();
  }

  handleNewReservationEvent(): void {
    this.#reservationTrackingService.trackReservationFlowStarted();
    this.toggle();
    this.#trackingService.track(
      new ClickGoToMakeNewReservationEvent({
        business_type: this.#userService.isBusiness() ? String(this.#userService.getUser()?.business?.type ?? '') : '',
        channel: this.#userService.isBusiness() ? String(this.#reservationContext.reservationChannel()) : '',
        reservation_flow_type: this.#userService.getReservationFlowType(),
        source: ClickGoToMakeNewReservationSourceEnum.SIDEBAR,
      }),
    );
    this.#router.navigate(['/reservations/create'], {
      queryParams: { channelId: this.#reservationContext.reservationChannel() },
    });
  }

  handleNotificationsEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickNotificationsEvent());
  }

  handleOboSettingsEvent(): void {
    this.toggle();
  }

  handleOrderListEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickOrdersEvent());
  }

  handleOrdersBulkRescheduleEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickOrdersBulkRescheduleEvent());
  }

  handleOrganizationTransportProvidersEvent(): void {
    this.toggle();
  }

  handlePatronManagementEvent(): void {
    this.toggle();
  }

  handleResellersEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickResellersEvent());
  }

  handleReservationsEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickReservationsEvent());
  }

  handleRoleManagementEvent(): void {
    this.toggle();
  }

  handleSalesSummaryEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickSalesSummaryEvent());
  }

  handleSettingsEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickSettingsEvent());
  }

  handleShiftsListEvent(): void {
    this.toggle();
  }

  handleTransportProvidersEvent(): void {
    this.toggle();
  }

  handleUserReservationsEvent(): void {
    this.toggle();
    this.#trackingService.track(
      new ClickUserReservationsEvent({
        business_type: this.#userService.isBusiness()
          ? (this.#userService.getUser()?.business?.type ?? BusinessTypeEnum.GUIDE)
          : BusinessTypeEnum.GUIDE,
        channel: this.#reservationContext.reservationChannel(),
      }),
    );
  }

  handleWhitelabelListEvent(): void {
    this.toggle();
    this.#trackingService.track(new ClickWhitelabelList());
  }

  handleWhitelistAddressEvent(): void {
    this.toggle();
  }

  get hasOwnBusiness(): boolean {
    return this.#userService.getUser()?.business?.id !== undefined;
  }

  get isAnalyticsMenuActive(): boolean {
    const currentPath = this.#router.url.split('?')[0];
    return currentPath === '/analytics' || isAnalyticsReportingSection(currentPath);
  }

  isOrganizationSelected(): boolean {
    return Boolean(this.#partnerService.getPartner());
  }

  /** Every whitelabel screen except translations is reached from the list, so the list entry stays highlighted across them. */
  get isWhitelabelListActive(): boolean {
    const currentRoute = this.#router.url;
    return currentRoute.includes('/whitelabels') && !currentRoute.startsWith('/whitelabels/translations');
  }

  loadMoreOrganizations(): void {
    this.isLoadingOrganizations = true;
    this.#getUserOrganizations();
  }

  logout(): void {
    this.#shiftReminderLogoutService
      .logout()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#resetUserState());
  }

  ngOnInit(): void {
    this.#updateOneStopShopMode();
    this.#breakpointStateService.observeBreakpoint(this.#destroyRef);
    this.oneStopShopModeChange.emit(this.isOneStopShopMode);
    this.updateScreenSize();
    this.checkDefaultSidebarStatus();
    this.expandMenu();
    if (!this.expandedItems.length) {
      this.expandedItems = this.toggleItem(this.activeMenu);
    }
    this.queryParamsMap = this.getQueryParamsMap();
    this.permissionsLoaded = false;
    this.#authenticationService.observeUser().subscribe(userId => {
      this.userId = userId!;
    });
    this.#optimizelyService.observeUserData().subscribe(() => {
      this.checkFeaturesEnabled();
    });
    this.#userService.observePermissions().subscribe(() => {
      this.hasShiftListPermissions = [Permissions.CAN_VIEW_SHIFTS, Permissions.CAN_VIEW_MY_SHIFTS].some(permission =>
        this.#userService.hasPermission(permission),
      );
      this.hasManagePartnerTransportProviders = this.#userService.hasPermission('can_manage_partner_transport_providers');
      this.hasManagePermissions = this.#userService.hasPermission('can_manage_permissions');
      this.hasManageTransportProviders = this.#userService.hasPermission('can_manage_transport_providers');
      this.showPlansList =
        this.#userService.hasPermission('can_view_plans') ||
        this.#userService.hasPermission('can_create_plans') ||
        this.#userService.hasPermission('can_manage_plan_reviews');
      this.showEventSettings = this.#userService.hasPermission(Permissions.CAN_VIEW_PLAN_SETTINGS);
      this.showScheduleAndTickets = this.#sessionsTabsResolver.hasAvailableTabs();
      this.showCancellationHistory = this.#canViewCancellationHistory();
      this.showContent = this.#contentPlanTabsResolver.hasAvailableTabs();
      this.showInventoryView = this.#shouldShowInventorySetup();
      this.#updateShowPricingIntelligence();
      this.#updateShowPricingRecommender();
      this.canViewChannelSettings =
        this.#userService.hasPermission(Permissions.CAN_VIEW_CHANNEL_SETTINGS) ||
        this.#userService.hasPermission(Permissions.CAN_MANAGE_EVENT_FEED_VISIBILITY) ||
        this.#userService.hasPermission(Permissions.CAN_PUBLISH_MAIN_PLAN_IN_CHANNEL) ||
        this.#userService.hasPermission(Permissions.CAN_PUBLISH_SESSION_TYPE_IN_CHANNEL);
      this.showEvents =
        this.#userService.hasPermission('can_view_attendees') ||
        this.#userService.hasPermission(Permissions.CAN_VIEW_INVITATIONS) ||
        this.#userService.hasPermission('can_view_content') ||
        this.#userService.hasPermission('can_view_bundles') ||
        this.#userService.hasPermission('can_view_plans') ||
        this.#userService.hasPermission('can_create_plans') ||
        this.#userService.hasPermission('can_manage_plan_reviews') ||
        this.#userService.hasPermission('can_view_price_lists') ||
        this.#userService.hasPermission(Permissions.CAN_VIEW_SESSION_ACTION_RULES) ||
        this.#userService.hasPermission(Permissions.CAN_VIEW_TIMESLOTS) ||
        this.canViewChannelSettings ||
        this.showEventSettings ||
        this.showScheduleAndTickets ||
        this.showContent ||
        this.showInventoryView;
      this.showRoleManagement =
        this.hasManagePermissions ||
        this.#userService.hasPermission(Permissions.CAN_VIEW_ROLES) ||
        this.#userService.hasPermission(Permissions.CAN_MANAGE_ROLES);
      this.showAdminProjectManagementSettings =
        this.#userService.hasPermission(Permissions.CAN_ADMIN_APPROVAL) ||
        this.#userService.hasPermission(Permissions.CAN_ADMIN_INFORMATION_REQUEST);
      this.showUserManagement = this.#userService.hasPermission(Permissions.CAN_VIEW_USER_MANAGEMENT);
      this.#updateShowOnsiteAppearance();
      this.#updateShowPartnerTags();
      this.#updateShowSettings();
      this.showProjectManagementEntry = this.#shouldShowProjectManagementEntry();
      this.showOrderBulkReschedule = this.#userService.hasPermission('can_bulk_reschedule_orders');
      this.#updateShowOdooPos();
      this.#updateShowAutoDiagnose();
      this.#updateShowBoxOfficeSection();
      this.#updateShowHistoricalSalesImportTool();
      this.#updateOrdersSectionVisibility();
      this.#updateShowGuestProfiles();
      this.#updateShowFundraising();
      this.showInvoices = this.#userService.hasPermission('can_view_finance');
      this.#updateShowBankAccount();
      this.#updateShowAuditReportTool();
      this.showFinanceMenu =
        this.showInvoices || this.showBillingPeriods || this.showPaymentCollectors || this.showAuditReportTool || this.showBankAccount;
      this.showAnalyticsMenuItem = [
        Permissions.CAN_VIEW_REPORTS,
        Permissions.CAN_VIEW_GLOBAL_REPORTS,
        Permissions.CAN_MANAGE_DASHBOARD_BUILDER,
      ].some(permission => this.#userService.hasPermission(permission));
      this.showWinnerSelection = this.#shouldShowWinnerSelection();
      this.#updateShowMarketingSection();
      this.#updateShowCommunicationsMenuItem();
      this.#updateShowPixelTracking();
      this.#updateShowAdsManager();
      this.#updateShowCrmCampaigns();
      this.#updateShowPricingExperiments();
      this.#updateShowReservationsSection();
      this.permissionsLoaded = true;

      // Set active menu to 'home' if user has the required permission
      if (this.#userService.hasPermission(Permissions.CAN_RESERVE_CART)) {
        this.activeMenu = 'home';
      }
    });
    this.#router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
      this.expandMenu();
    });
    this.#initializeToggleSidebarEvent();

    this.#selectedPlanContextService
      .observeContextChanges()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.queryParamsMap = this.getQueryParamsMap();
      });

    combineLatest([
      this.#selectedPlanContextService.observeCanViewSelectedPlan(),
      this.#selectedPlanContextService.observeCanManageSelectedPlan(),
      this.#selectedPlanContextService.observeIsInventoryAvailableForSelectedPlan(),
    ])
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(([canView, canManage, isInventoryAvailable]) => {
        this.canViewSelectedPlan = canView;
        this.canManageSelectedPlan = canManage;
        this.isInventoryAvailableForSelectedPlan = isInventoryAvailable;
        if (!canView && this.#isOnPlanKindEventRoute()) {
          this.#redirectWhenCannotViewSelectedPlanOnEventRoute();
        } else if (!canManage && this.#isOnPlanKindRestrictedRoute()) {
          this.#redirectWhenCannotManageSelectedPlanOnRestrictedRoute();
        }
      });

    window.addEventListener('storage', event => {
      if (event.key === 'onsite_setup_config') {
        this.#updateOneStopShopMode();
      }
    });

    this.#router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.#updateOneStopShopMode();
        this.updateScreenSize();

        if (!this.isSticky && this.isActive) {
          this.#closeSidebar();
        }

        if (this.permissionsLoaded && !this.canViewSelectedPlan && this.#isOnPlanKindEventRoute()) {
          this.#redirectWhenCannotViewSelectedPlanOnEventRoute();
        } else if (this.permissionsLoaded && !this.canManageSelectedPlan && this.#isOnPlanKindRestrictedRoute()) {
          this.#redirectWhenCannotManageSelectedPlanOnRestrictedRoute();
        }
      });
  }

  onClickOutside(): void {
    if (this.isSticky) {
      return;
    }
    this.#closeSidebar();
  }

  onLoadMoreOrganizations(): void {
    if (this.isLoadingOrganizations) {
      return;
    }

    const total: number = this.organizations.length;
    if (total === 0) {
      return;
    }

    if (this.nextPage) {
      this.page = this.page + 1;
      this.loadMoreOrganizations();
    }
  }

  onOpenControlPanel(): void {
    this.#organizationDialog?.close();
    this.#resetOrganizationList();
    void this.#router.navigate(['/control-panel']);
  }

  onOrganizationSelected(organizationId: number): void {
    this.#landingTargetService.prefetch(organizationId);
    this.#spinnerService.show();
    this.#syncSelectedOrganizationRole(organizationId, () => {
      this.partnerGetSubscription = this.#partnerService.get(organizationId).subscribe(response => {
        if (response?.data) {
          this.permissionsLoaded = false;
          this.#planStateService.reset();
          // Derived from the organization being left, like the plan state above. Without it the actor
          // and its business list survive the switch and can be sent on calls scoped to the new
          // organization (GAME-1340).
          this.#reservationBusinessChooseService.reset();
          this.#userService.clearPermissions();
          this.#whitelabelAccessService.clear();
          this.queryParamsMap.clear();
          this.queryParamsMap = this.getQueryParamsMap();
          this.#partnerService.select(response.data, '/');
          this.#oboSecondScreenDataService.create(response.data.id);
        } else {
          this.#spinnerService.hide();
          this.#dialogService.openMessageModal(
            this.#translate.instant('common.errorTitle'),
            this.#translate.instant(response.error.message),
          );
          this.permissionsLoaded = true;
          this.partnerGetSubscription?.unsubscribe();
        }
      });
    });
    this.#resetOrganizationList();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateScreenSize();
    this.checkDefaultSidebarStatus();
  }

  onSearchOrganization(searchParam: string): void {
    this.isLoadingOrganizations = true;
    this.searchParam = searchParam;
    this.organizations = [];
    this.nextItemsPerPage = this.initialItemsPerPage;
    this.nextPage = this.initialPage;
    this.#getUserOrganizations();
  }

  onShowDeletedChanged(showDeleted: boolean): void {
    this.organizations = [];
    this.nextItemsPerPage = this.initialItemsPerPage;
    this.nextPage = this.initialPage;
    this.isLoadingOrganizations = true;
    this.showDeleted = showDeleted;
    this.#getUserOrganizations();
  }

  onSidebarClick(event: MouseEvent): void {
    if (this.isSticky) {
      return;
    }
    const anchor = (event.target as HTMLElement).closest('a.menu-item') as HTMLAnchorElement | null;
    if (anchor?.getAttribute('href')) {
      this.#closeSidebar();
    }
  }

  openBoxOffice(): void {
    this.#trackingService.track(
      new ClickBoxOfficeEvent({
        time: new Date().toISOString(),
      }),
    );
  }

  openSelectOrganizationModal(): void {
    this.organizations = [];
    this.#organizationPreferencesService.load();
    this.nextItemsPerPage = this.initialItemsPerPage;
    this.nextPage = 1;
    this.searchParam = '';
    this.isLoadingOrganizations = true;

    // The ng-bootstrap gate stays as a fallback until S13 (B2BP-1722) retires that stack.
    if (!this.#modalService.hasOpenModals() && !this.#dialogService.hasOpenDialogs()) {
      this.#organizationDialogOrganizations.set([]);
      this.#organizationDialogLoading.set(true);
      this.#organizationDialog = this.#dialogService.openModal<number, SelectOrganizationDialogData>(SelectOrganizationComponent, {
        data: {
          loading: this.#organizationDialogLoading.asReadonly(),
          organizations: this.#organizationDialogOrganizations.asReadonly(),
          onLoadMoreOrganizations: () => this.onLoadMoreOrganizations(),
          onOpenControlPanel: () => this.onOpenControlPanel(),
          onSearchOrganization: (searchParam: string) => this.onSearchOrganization(searchParam),
          onShowDeletedChanged: (showDeleted: boolean) => this.onShowDeletedChanged(showDeleted),
        },
        size: 'sm',
      });
      this.#observeOrganizationDialogClose();
    }
    this.#getUserOrganizations();
  }

  showSelectOrganization(): boolean {
    return this.#userService.getNumberOfOrganizations() > 1;
  }

  toggle(): void {
    if (this.isSticky) {
      return;
    }
    this.isActive = !this.isActive;
    this.#emitSidebarState();
  }

  toggleFromHeader(): void {
    this.isActive = !this.isActive;
    this.toggleSidebarEmitter.emit(this.isActive);
    this.#syncOverlayScrollLock();
  }

  toggleItem(itemKey: string, keepParent: boolean = false): string[] {
    if (this.expandedItems.includes(itemKey)) this.expandedItems = this.expandedItems.filter(key => key !== itemKey);
    else if (keepParent) this.expandedItems.push(itemKey);
    else this.expandedItems = [itemKey];
    return this.expandedItems;
  }

  updateScreenSize(): void {
    const previousIsSticky = this.isSticky;
    if (this.isOneStopShopMode) {
      this.isSticky = false;
    } else {
      this.isSticky = window.innerWidth > this.#stickyBreakpoint() && !this.isDualScreen;
    }
    this.#syncOverlayScrollLock();

    if (previousIsSticky && !this.isSticky) {
      this.#unpinnedForTheRoute = this.#routeNeedsTheWholeWidth();
      this.#closeSidebar();
      return;
    }

    if (!previousIsSticky && this.isSticky && this.#unpinnedForTheRoute) {
      this.#unpinnedForTheRoute = false;
      this.isActive = true;
      this.#emitSidebarState();
    }
  }

  protected canAccessBusinesses(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_GET_BUSINESSES) &&
      [Permissions.CAN_CREATE_BUSINESSES, Permissions.CAN_EDIT_BUSINESSES].some(permission => this.#userService.hasPermission(permission))
    );
  }

  protected get isSalesRoutingActive(): boolean {
    return this.#router.url.includes('/sales-routing');
  }

  // With the flag off the list leaves distributors out, so a member of a pilot partner's business would lose the way back to it.
  #appendPilotBusinessOrganizations(requestId: number): void {
    const readPage = (page: number, itemsPerPage: number) =>
      this.#userService.getOrganizations({
        includeRole: true,
        itemsPerPage,
        operatingPlatform: 'feverzone',
        organizationCategory: 'distributors',
        page,
        showBookingAgents: true,
        showDeleted: false,
        userId: this.userId!,
      });

    readPage(1, PILOT_BUSINESS_ORGANIZATIONS_PAGE_SIZE)
      .pipe(
        expand(response => {
          const nextPage = response?.data ? response.getNextPaginationPage() : null;
          return nextPage === null
            ? EMPTY
            : readPage(nextPage, response.getNextPaginationItemsPerPage() ?? PILOT_BUSINESS_ORGANIZATIONS_PAGE_SIZE);
        }),
        reduce<LinkPaginationResponse<OrganizationSummary | null>, Organization[]>(
          (organizations, response) => organizations.concat(response?.data?.organizations ?? []),
          [],
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(fetchedOrganizations => {
        if (requestId !== this.#listRequestId) {
          return;
        }
        const pilotBusinessOrganizations = this.#businessAsOrganizationFlag.pilotBusinessOrganizations(
          fetchedOrganizations,
          this.organizations,
        );
        if (pilotBusinessOrganizations.length === 0) {
          return;
        }
        this.organizations = this.organizations.concat(pilotBusinessOrganizations);
        this.#userService.setNumberOfOrganizations(this.organizations.length);
        this.#syncOrganizationDialog();
      });
  }

  #canAccessPlansRoute(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_VIEW_PLANS) ||
      this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS) ||
      this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS)
    );
  }

  #canViewCancellationHistory(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_CANCEL_SESSIONS) &&
      (this.#optimizelyService.isFeatureEnabled('can_cancel_sessions') ?? false)
    );
  }

  #clearedPlanQueryParams(): Params {
    const cityId = this.#selectedPlanContextService.currentContext.cityId;
    return {
      ...(cityId !== undefined ? { cityId } : {}),
      planId: null,
      planName: null,
      venueId: null,
      venueName: null,
    };
  }

  #closeSidebar(): void {
    if (this.isActive) {
      this.isActive = false;
      this.#emitSidebarState();
    }
  }

  #emitSidebarState(): void {
    this.toggleSidebarEmitter.emit(this.isActive);
    this.#syncOverlayScrollLock();
  }

  #getUserOrganizations(continuingList = false): void {
    if (!continuingList) {
      this.#listRequestId += 1;
    }
    this.#syncOrganizationDialog();
    const requestId = this.#listRequestId;
    if (!this.nextPage || this.nextPage === this.initialPage) {
      this.#hiddenOrganizations = [];
    }
    this.#userService
      .getOrganizations({
        includeRole: true,
        itemsPerPage: this.nextItemsPerPage,
        operatingPlatform: 'feverzone',
        page: this.nextPage,
        search: this.searchParam,
        showBookingAgents: this.showBookingAgents,
        showDeleted: this.showDeleted,
        userId: this.userId!,
      })
      .pipe(this.#untilDestroyedWhenHidingBusinessPartners())
      .subscribe(response => {
        if (this.showBookingAgents && requestId !== this.#listRequestId) {
          return;
        }
        if (response?.data) {
          const fetchedOrganizations = this.showBookingAgents
            ? hideBusinessPartnerOrganizations(response.data.organizations)
            : response.data.organizations;
          this.#hiddenOrganizations = this.#hiddenOrganizations.concat(
            response.data.organizations.filter(organization => !fetchedOrganizations.includes(organization)),
          );
          this.organizations = this.organizations.concat(fetchedOrganizations);
          this.totalOrganizations = response.data.total;
          this.nextItemsPerPage = response.getNextPaginationItemsPerPage()!;
          this.nextPage = response.getNextPaginationPage()!;
          if (this.#shouldLoadNextPageBeforeDeciding(fetchedOrganizations.length)) {
            this.#getUserOrganizations(true);
            return;
          }
          if (this.showBookingAgents && !this.nextPage && this.organizations.length === 0 && !this.searchParam) {
            this.organizations = this.#hiddenOrganizations;
          } else if (this.showBookingAgents && !this.nextPage && !this.searchParam) {
            this.#userService.setNumberOfOrganizations(this.organizations.length);
          }
          if (!this.showBookingAgents && !this.nextPage && !this.searchParam && !this.showDeleted) {
            this.#appendPilotBusinessOrganizations(requestId);
          }
          this.isLoadingOrganizations = false;
          this.#syncOrganizationDialog();
        } else {
          this.isLoadingOrganizations = false;
          this.#syncOrganizationDialog();
          this.#dialogService.openMessageModal(
            this.#translate.instant('common.errorTitle'),
            this.#translate.instant(response.error!.message),
          );
        }
      });
  }

  #hasAnyPermission(permissions: readonly Permissions[]): boolean {
    return permissions.some(permission => this.#userService.hasPermission(permission));
  }

  #initializeToggleSidebarEvent() {
    fromEvent(window, TOGGLE_SIDEBAR_EVENT_KEY)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((event: Event) => {
        queueMicrotask(() => {
          const customEvent = event as CustomEvent;
          const isOpen = customEvent.detail?.isOpen ?? this.isActive;
          if (this.isActive !== isOpen) {
            this.toggleFromHeader();
          }
        });
      });
  }

  #isBoxOfficeTicketingRoute(url: string): boolean {
    const allowedRoutes = ['/box-office'];

    const urlWithoutParams = url.split('?')[0];
    return allowedRoutes.some(route => urlWithoutParams.endsWith(route));
  }

  #isDataFlagEnabled(optimizelyFeatureKey: FeatureFlags): boolean {
    return this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey, team: 'data' }) ?? false;
  }

  #isOnPlanKindEventRoute(): boolean {
    const eventRoutes = [
      '/plans/dashboard',
      '/plan/detail',
      '/event-settings',
      '/inventory',
      '/sessions',
      '/channels-settings',
      '/attendees',
      '/invitations',
      '/winner-selection',
    ];
    const currentUrl = this.#router.url.split('?')[0];
    return eventRoutes.some(route => currentUrl.includes(route));
  }

  #isOnPlanKindRestrictedRoute(): boolean {
    const restrictedRoutes = [
      '/inventory',
      '/sessions',
      '/channels-settings',
      '/attendees',
      '/invitations',
      '/landings',
      '/bundles',
      '/winner-selection',
    ];
    const currentUrl = this.#router.url.split('?')[0];
    return restrictedRoutes.some(route => currentUrl.includes(route));
  }

  #observeOrganizationDialogClose(): void {
    this.#organizationDialog?.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(organizationId => {
      this.#organizationDialog = undefined;
      if (organizationId === undefined) {
        this.#resetOrganizationList();
        this.permissionsLoaded = true;
        return;
      }
      this.onOrganizationSelected(organizationId);
    });
  }

  #redirectWhenCannotManageSelectedPlanOnRestrictedRoute(): void {
    if (this.#canAccessPlansRoute()) {
      this.#router.navigate(['/plans/dashboard'], {
        queryParamsHandling: 'preserve',
        replaceUrl: true,
      });
      return;
    }

    this.#router.navigate([this.#userService.getFirstActiveUrlByPermission()], {
      queryParams: this.#clearedPlanQueryParams(),
      replaceUrl: true,
    });
  }

  #redirectWhenCannotViewSelectedPlanOnEventRoute(): void {
    if (this.#canAccessPlansRoute()) {
      this.#router.navigate(['/plans'], {
        queryParamsHandling: 'preserve',
        replaceUrl: true,
      });
      return;
    }

    this.#router.navigate([this.#userService.getFirstActiveUrlByPermission()], {
      queryParams: this.#clearedPlanQueryParams(),
      replaceUrl: true,
    });
  }

  #resetOrganizationList(): void {
    this.#listRequestId += 1;
    this.searchParam = '';
    this.organizations = [];
    this.nextItemsPerPage = this.initialItemsPerPage;
    this.nextPage = this.initialPage;
  }

  #resetUserState(): void {
    this.permissionsLoaded = false;
    this.organizations = [];
    this.totalOrganizations = 0;
    this.#planStateService.reset();
    this.#reservationBusinessChooseService.reset();
    this.#userService.clearPermissions();
    this.#partnerExternalIdsService.clearCache();
    this.#whitelabelAccessService.clear();
    this.#userService.setSelectedOrganizationRole(null);
    this.queryParamsMap.clear();
  }

  #routeNeedsTheWholeWidth(): boolean {
    return this.#router.url.includes('/whitelabels/editor');
  }

  // A page of only hidden organizations adds nothing to the list, so the scroll that asked for it never fires
  // again: keep reading until it shows something or pagination ends.
  #shouldLoadNextPageBeforeDeciding(visibleFetchedCount: number): boolean {
    return this.showBookingAgents && !!this.nextPage && (this.organizations.length < this.initialItemsPerPage || visibleFetchedCount === 0);
  }

  #shouldShowInventorySetup(): boolean {
    if (!this.#optimizelyService.isFeatureEnabled(FeatureFlags.INVENTORY_VIEW)) {
      return false;
    }

    if (this.#priceListPermissions.isPriceListsEnabled()) {
      return true;
    }

    if (this.#schedulePermissions.isScheduleEnabled()) {
      return true;
    }

    const canViewDynamicPricingRules = this.#dynamicPricingPermissions.isDynamicPricingEnabled();
    const canOpenSimulator =
      canViewDynamicPricingRules && (this.#optimizelyService.isFeatureEnabled(FeatureFlags.ADAPTATIVE_PRICING_SIMULATOR_VIEW) ?? false);
    const canOpenTicketTypes =
      this.#userService.hasPermission(Permissions.CAN_VIEW_TICKET_TYPES) &&
      (this.#optimizelyService.isFeatureEnabled(FeatureFlags.TICKET_TYPES_VIEW) ?? false);

    return canViewDynamicPricingRules || canOpenSimulator || canOpenTicketTypes;
  }

  #shouldShowMemberships(): boolean {
    return (
      this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.MEMBERSHIPS_MANAGEMENT_VIEW, team: 'museums' }) ?? false
    );
  }

  #shouldShowProjectManagementEntry(): boolean {
    const featureEnabled = this.#optimizelyService.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) ?? false;
    const hasProjectManagementPermission =
      this.#userService.hasPermission(Permissions.CAN_CREATE_APPROVAL) ||
      this.#userService.hasPermission(Permissions.CAN_CREATE_INFORMATION_REQUEST) ||
      this.#userService.hasPermission(Permissions.CAN_SUBMIT_APPROVAL) ||
      this.#userService.hasPermission(Permissions.CAN_SUBMIT_INFORMATION_REQUEST);
    return featureEnabled && hasProjectManagementPermission;
  }

  #shouldShowWinnerSelection(): boolean {
    const featureEnabled = this.#optimizelyService.isFeatureEnabled(FeatureFlags.WINNER_RESOLVE) ?? false;
    const hasResolvePermission =
      this.#userService.hasPermission(Permissions.CAN_RESOLVE_AUCTION) ||
      this.#userService.hasPermission(Permissions.CAN_RESOLVE_PRIZE_DRAWS);
    return featureEnabled && hasResolvePermission;
  }

  #stickyBreakpoint(): number {
    return this.#routeNeedsTheWholeWidth() ? SidebarComponent.editorStickyBreakpoint : SidebarComponent.defaultStickyBreakpoint;
  }

  #syncOrganizationDialog(): void {
    this.#organizationDialogOrganizations.set(this.organizations);
    this.#organizationDialogLoading.set(this.isLoadingOrganizations);
  }

  #syncOverlayScrollLock(): void {
    this.#document.documentElement.classList.toggle(SidebarComponent.overlayOpenClass, this.isActive && !this.isSticky);
  }

  #syncSelectedOrganizationRole(organizationId: number, proceed: () => void): void {
    if (this.organizations.some(organization => organization.id === organizationId)) {
      this.#userService.setSelectedOrganizationRoleFromOrganizations(this.organizations, organizationId);
      proceed();
      return;
    }
    // A recent chip can name a partner the list hides, so its role is read by id instead.
    this.#userService
      .getOrganizations({
        includeRole: true,
        itemsPerPage: 1,
        operatingPlatform: 'feverzone',
        organizationIds: [organizationId],
        page: 1,
        showBookingAgents: true,
        showDeleted: this.showDeleted,
        userId: this.userId!,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        const organization = response?.data?.organizations[0];
        if (organization === undefined) {
          this.#spinnerService.hide();
          this.#dialogService.openMessageModal(this.#translate.instant('common.errorTitle'), this.#translate.instant('errors.generic'));
          return;
        }
        this.#userService.setSelectedOrganizationRoleFromOrganizations([organization], organizationId);
        proceed();
      });
  }

  #untilDestroyedWhenHidingBusinessPartners<T>(): OperatorFunction<T, T> {
    return this.showBookingAgents ? takeUntilDestroyed<T>(this.#destroyRef) : identity;
  }

  #updateOneStopShopMode(): void {
    const onsiteSetupConfig = this.#onsiteSetupsStorageService.getConfiguration();
    const currentUrl = this.#router.url;
    const isBoxOfficeTicketingRoute = this.#isBoxOfficeTicketingRoute(currentUrl);
    const wasOneStopShopMode = this.isOneStopShopMode;
    this.isOneStopShopMode = isBoxOfficeTicketingRoute && onsiteSetupConfig?.obo_flow_type === OboFlowTypeEnum.one_stop_shop;

    if (wasOneStopShopMode !== this.isOneStopShopMode) {
      this.updateScreenSize();
      this.checkDefaultSidebarStatus();
      this.oneStopShopModeChange.emit(this.isOneStopShopMode);
    }
  }

  /**
   * With the unified list enabled the entry is permission-driven for everyone — browsing is gated per
   * partner by the settlement-contract mode inside the screen, so `orders_view` is no longer the
   * section lever there. Partners still on the legacy list keep the historical `orders_view` +
   * `can_view_orders` gate, because that list browses freely and cannot serve validation-only users.
   */
  #updateOrdersSectionVisibility(): void {
    const unifiedOrderListEnabled = this.#optimizelyService.isFeatureEnabled(FeatureFlags.UNIFIED_ORDERS_LIST) ?? false;
    const ordersViewEnabled = this.#optimizelyService.isFeatureEnabled(FeatureFlags.ORDERS_VIEW) ?? false;
    this.showOrderListEntry = unifiedOrderListEnabled
      ? this.#userService.hasPermission(Permissions.CAN_VIEW_ORDERS) || this.#userService.hasPermission(Permissions.CAN_VIEW_VALIDATE)
      : ordersViewEnabled && this.#userService.hasPermission(Permissions.CAN_VIEW_ORDERS);
    this.showExternalCodes = this.#userService.hasPermission(Permissions.CAN_VIEW_EXTERNAL_CODES);
    this.showOrdersSection =
      this.showOrderListEntry ||
      this.#userService.hasPermission('can_view_codes') ||
      this.#userService.hasPermission('can_bulk_reschedule_orders') ||
      this.showHistoricalSalesImportTool ||
      this.showBulkPartialRefunds ||
      this.showExternalCodes;
  }

  #updateShowAdsManager(): void {
    this.showAdsManager =
      (this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.SHOW_ADS_MANAGER, team: 'data-marketing' }) ??
        false) &&
      this.#userService.hasPermission('can_view_marketing');
  }

  #updateShowAuditReportTool(): void {
    this.showAuditReportTool = this.#userService.hasPermission(Permissions.CAN_VIEW_AUDIT_REPORT_TOOL);
  }

  /** Auto diagnose checks the till's hardware, so it also needs the dual-screen app. */
  #updateShowAutoDiagnose(): void {
    this.#showAutoDiagnose.set(
      this.#userService.hasPermission(Permissions.CAN_EXECUTE_HARDWARE_AUTODIAGNOSE) && this.#dualScreenStorageService.containsData(),
    );
  }

  #updateShowBankAccount(): void {
    this.showBankAccount = hasBankAccountPermission(this.#userService);
  }

  /**
   * Every term mirrors the visibility of one entry the section renders, so the accordion is never
   * offered when everything inside it is hidden. `#updateShowOdooPos` and `#updateShowAutoDiagnose`
   * must run first: `showOdooPos` and `showAutoDiagnose` are among those terms.
   */
  #updateShowBoxOfficeSection(): void {
    this.showBoxOfficeSection =
      this.#userService.hasPermission(Permissions.CAN_VIEW_BOX_OFFICE) ||
      this.showOdooPos ||
      this.showAutoDiagnose() ||
      (!this.hideBoxOfficeStats && this.#userService.hasPermission(Permissions.CAN_VIEW_BOX_OFFICE_STATS)) ||
      this.#userService.hasPermission(Permissions.CAN_MANAGE_CASH_REGISTER_REPORTS) ||
      (this.showShiftsList && this.hasShiftListPermissions);
  }

  #updateShowCommunicationsMenuItem(): void {
    this.showCommunicationsMenuItem = this.showCommunications && this.#userService.hasPermission('can_edit_template_configurations');
  }

  #updateShowCrmCampaigns(): void {
    this.showCrmCampaigns.set(
      (this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.SHOW_CRM_CAMPAIGNS, team: 'data-marketing' }) ??
        false) &&
        this.#userService.hasPermission('can_view_marketing') &&
        this.#userService.hasPermission(Permissions.CAN_MANAGE_CRM_CAMPAIGNS),
    );
  }

  #updateShowFundraising(): void {
    this.showMuseumsWipFeatures =
      this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.MUSEUMS_WIP_FEATURES, team: 'museums' }) ?? false;
    this.showPipeline =
      this.#hasAnyPermission(fundraisingPermissions.pipeline) && this.#hasAnyPermission(fundraisingPermissions.guestProfiles);
    this.showFundraising =
      this.#hasAnyPermission(fundraisingPermissions.donationPrompts) ||
      (this.showMuseumsWipFeatures && (this.#hasAnyPermission(fundraisingPermissions.donationPages) || this.showPipeline));
  }

  #updateShowGuestProfiles(): void {
    this.showGuestProfiles = this.#hasAnyPermission(fundraisingPermissions.guestProfilesParentRoute);
  }

  #updateShowHistoricalSalesImportTool(): void {
    this.showHistoricalSalesImportTool =
      this.#userService.hasPermission(Permissions.CAN_RUN_HISTORIC_SALES_IMPORT) &&
      (this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.SHOW_HISTORICAL_DATA_UPLOAD_TOOL, team: 'data' }) ??
        false);
  }

  #updateShowMarketingSection(): void {
    this.showMarketingSection =
      this.#userService.hasPermission('can_view_marketing') || this.#userService.hasPermission('can_edit_template_configurations');
  }

  /**
   * The permissions mirror the `sellingPermissions` of the `/box-office` selling routes: F&B is a
   * point of sale, so a read-only Box Office role must not reach it.
   */
  #updateShowOdooPos(): void {
    const hasBoxOfficeSellingPermission =
      this.#userService.hasPermission(Permissions.CAN_VIEW_BOX_OFFICE) || this.#userService.hasPermission(Permissions.CAN_MANAGE_STOCK);

    this.showOdooPos =
      hasBoxOfficeSellingPermission &&
      (this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.CAN_VIEW_ODOO_POS_SUBSECTION, team: 'b2b-shops' }) ??
        false);
  }

  #updateShowOnsiteAppearance(): void {
    this.showOnsiteAppearance =
      (this.#optimizelyService.isFeatureEnabled(FeatureFlags.ONSITE_APPEARANCE_CONFIG) ?? false) &&
      this.#userService.hasPermission(Permissions.CAN_VIEW_BRANDING_CONFIG);
  }

  #updateShowPartnerTags(): void {
    this.showPartnerTags = canAccessBookingTags(this.#optimizelyService, this.#userService);
  }

  #updateShowPixelTracking(): void {
    this.showPixelTracking =
      (this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.SHOW_PIXEL_TRACKING, team: 'data-collection' }) ??
        false) &&
      this.#userService.hasPermission(Permissions.CAN_VIEW_PLAN_TRACKING_PIXEL);
  }

  #updateShowPricingExperiments(): void {
    this.showPricingExperiments.set(this.#isDataFlagEnabled(FeatureFlags.SHOW_PRICING_EXPERIMENTS));
  }

  #updateShowPricingIntelligence(): void {
    this.showPricingIntelligence.set(
      this.#isDataFlagEnabled(FeatureFlags.SHOW_PRICING_INTELLIGENCE) &&
        this.#userService.hasPermission(Permissions.CAN_VIEW_DYNAMIC_PRICING_RULES) &&
        this.#userService.hasPermission(Permissions.CAN_MODIFY_PRICE_LISTS),
    );
  }

  #updateShowPricingRecommender(): void {
    this.showPricingRecommender.set(
      this.#isDataFlagEnabled(FeatureFlags.SHOW_PRICING_RECOMMENDER) && this.#userService.hasPermission(Permissions.CAN_VIEW_REPORTS),
    );
  }

  #updateShowReservationsSection(): void {
    const hasOverview = this.#userService.hasPermission(Permissions.CAN_VIEW_RESERVATIONS);
    const hasLeads = this.showLeads && this.leadsPermissions.some(permission => this.#userService.hasPermission(permission));
    const hasBusinesses = this.canAccessBusinesses();
    const hasRules = this.#userService.hasPermission(Permissions.CAN_CONFIGURE_RESERVATION_RULES);
    const hasDepositSettings = this.showDeposits && this.#userService.hasPermission(Permissions.CAN_MANAGE_DEPOSITS);

    this.showReservationsSection =
      (hasOverview || hasLeads || hasBusinesses || hasRules || hasDepositSettings) && !this.#userService.isBusiness();
  }

  #updateShowSettings(): void {
    this.canAccessTasks = this.#tasksPermissions.isTasksEnabled();
    this.showSettings =
      this.showUserManagement ||
      this.#userService.hasPermission(Permissions.CAN_VIEW_ORGANIZATION_SETTINGS) ||
      this.hasManagePermissions ||
      this.showRoleManagement ||
      this.hasManagePartnerTransportProviders ||
      this.hasManageTransportProviders ||
      this.showAdminProjectManagementSettings ||
      this.showOnsiteAppearance ||
      this.showPartnerTags ||
      this.canAccessTasks;
  }

  private checkFeaturesEnabled(): void {
    this.#updateShowFundraising();
    this.showMarketing = this.#optimizelyService.isFeatureEnabled('marketing_view') || false;
    this.showCoupons = this.#optimizelyService.isFeatureEnabled('coupons') || false;
    this.showBranding = this.#optimizelyService.isFeatureEnabled('show_branding_page') || false;
    this.#updateShowPixelTracking();
    this.#updateShowAdsManager();
    this.#updateShowCrmCampaigns();
    this.#updateShowPricingExperiments();
    this.#updateShowPricingIntelligence();
    this.#updateShowPricingRecommender();
    this.showCommunications =
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.CAN_VIEW_TEMPLATE_CONFIGURATIONS,
        team: 'data-marketing',
      }) || false;
    this.showOrderList = this.#optimizelyService.isFeatureEnabled(FeatureFlags.ORDERS_VIEW) || false;
    this.hideBoxOfficeStats = this.#optimizelyService.isFeatureEnabled(FeatureFlags.HIDE_BOX_OFFICE_STATS_VIEW) || false;
    this.#updateShowOdooPos();
    this.#updateShowAutoDiagnose();
    this.#updateShowBoxOfficeSection();
    this.showDeposits = this.#optimizelyService.isFeatureEnabled(FeatureFlags.DEPOSITS) || false;
    this.showLeads = this.#optimizelyService.isFeatureEnabled(FeatureFlags.RESERVATION_LEADS_VIEW) ?? false;
    this.#updateShowReservationsSection();
    this.showAgreements = this.#optimizelyService.isFeatureEnabled('agreements') || false;
    this.showB2bPublishing = this.#optimizelyService.isFeatureEnabled(FeatureFlags.ORGANIZER_B2BM) || false;
    this.showAgreementsModule =
      (this.#optimizelyService.isFeatureEnabled(FeatureFlags.AGREEMENTS_VIEW) ?? false) &&
      this.#userService.hasPermission(Permissions.CAN_MANAGE_AGREEMENTS);
    this.showAmbassadors = this.#optimizelyService.isFeatureEnabled(FeatureFlags.ENABLE_AMBASSADORS) || false;
    this.showEntitlements =
      this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.ENABLE_ENTITLEMENTS_SETUP, team: 'parks' }) ?? false;
    this.showCashless = this.#userService.hasPermission(Permissions.CAN_VIEW_CASHLESS);
    this.showGuestlists = this.#userService.hasPermission(Permissions.CAN_VIEW_GUESTLISTS);
    this.showVipTables = this.#userService.hasPermission(Permissions.CAN_VIEW_VIP_TABLE);
    this.showProjectManagementEntry = this.#shouldShowProjectManagementEntry();
    this.#updateShowOnsiteAppearance();
    this.showMemberships = this.#shouldShowMemberships();
    this.ordersBulkRescheduleView = this.#optimizelyService.isFeatureEnabled('orders_bulk_reschedule_view') || false;
    this.showBundlesView = this.#optimizelyService.isFeatureEnabled('bundles_view') || false;
    this.showInventoryView = this.#shouldShowInventorySetup();
    this.showWinnerSelection = this.#shouldShowWinnerSelection();
    this.showRetail = this.#userService.hasPermission(this.shopProductPermissions);
    this.showSalesRouting = this.#userService.hasPermission(this.salesRoutingPermissions);
    this.showLandings = this.#optimizelyService.isFeatureEnabled('landings_view') || false;
    this.showTransportConfiguration =
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.TRANSPORT_CONFIGURATION,
        team: 'b2b-onsite',
      }) || false;
    this.showWhitelistAddress = this.#optimizelyService.isFeatureEnabled('show_whitelist_address_page') || false;
    this.showScheduleAndTickets = this.#sessionsTabsResolver.hasAvailableTabs();
    this.showCancellationHistory = this.#canViewCancellationHistory();
    this.showContent = this.#contentPlanTabsResolver.hasAvailableTabs();
    this.showFaqSets =
      (this.#userService.getUser()?.isStaff() ?? false) &&
      (this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.FAQ_SETS_VIEW, team: 'experience' }) ?? false);
    this.showBulkPartialRefunds =
      (this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.PARTIAL_REFUNDS_VIEW,
        team: 'user-operations-excellence',
      }) ??
        false) &&
      this.#userService.hasPermission(Permissions.CAN_ISSUE_PARTIAL_REFUNDS);
    this.showDeleted = false;
    this.showBookingAgents = this.#businessAsOrganizationFlag.isEnabledGlobally();
    this.venuesManagementView = this.#optimizelyService.isFeatureEnabled('venues_management_view') || false;
    this.countriesManagementView = this.#optimizelyService.isFeatureEnabled('countries_management_view') || false;
    this.citiesManagementView = this.#optimizelyService.isFeatureEnabled('cities_management_view') || false;
    this.showAssetCalendarListView = this.#optimizelyService.isFeatureEnabled(FeatureFlags.ASSET_BASED_CALENDAR_LIST_VIEW) || false;
    this.showPaymentCollectors = this.#optimizelyService.isFeatureEnabled('payment_collector_tapi_channels') || false;
    this.showBillingPeriods =
      this.#userService.hasPermission('can_view_finance') && this.#partnerService.getPartner()?.isBillingPeriodsActive === true;
    this.#updateShowBankAccount();
    this.#updateShowAuditReportTool();
    this.showFinanceMenu =
      this.showInvoices || this.showBillingPeriods || this.showPaymentCollectors || this.showAuditReportTool || this.showBankAccount;
    this.#updateShowHistoricalSalesImportTool();
    this.#updateOrdersSectionVisibility();
    this.#updateShowMarketingSection();
    this.#updateShowCommunicationsMenuItem();
    this.#updateShowPartnerTags();
    this.#updateShowSettings();
  }

  private expandMenu(): void {
    const currentRoute = this.#router.url;
    if (currentRoute.indexOf('/home') !== -1) {
      this.activeMenu = 'home';
    } else if (currentRoute.indexOf('/customer-questions-catalog') !== -1) {
      this.activeMenu = 'customer-questions-catalog';
    } else if (currentRoute.indexOf('box-office') !== -1) {
      this.activeMenu = 'box-office';
    } else if (currentRoute.indexOf('/products') !== -1) {
      this.activeMenu = 'products';
      this.expandedItems = ['products'];
    } else if (currentRoute.indexOf('/settings/') !== -1 || currentRoute.indexOf('/onsite-appearance') !== -1) {
      this.activeMenu = 'organization-settings';
      this.expandedItems = ['organization-settings'];
    } else if (currentRoute.indexOf('/reviews') !== -1) {
      this.activeMenu = 'reviews';
    } else if (currentRoute.includes('/vip-tables')) {
      this.activeMenu = 'vip-tables';
      this.expandedItems = ['vip-tables'];
    } else if (currentRoute.includes('/guestlists')) {
      this.activeMenu = 'guestlists';
      this.expandedItems = ['guestlists'];
    } else if (
      currentRoute.startsWith('/pricing/experiments') ||
      currentRoute.startsWith('/pricing/intelligence') ||
      currentRoute.startsWith('/pricing/pricing-recommender')
    ) {
      this.activeMenu = 'pricing';
      this.expandedItems = ['pricing'];
    } else if (this.isEventsMenu(currentRoute)) {
      this.activeMenu = 'events';
      this.expandedItems = ['events'];
    } else if (currentRoute.indexOf('/billing') !== -1 || currentRoute.indexOf('/finance') !== -1) {
      this.activeMenu = 'finance';
      this.expandedItems = ['finance'];
    } else if (currentRoute.indexOf('marketing') !== -1) {
      this.activeMenu = 'marketing';
      this.expandedItems = ['marketing'];
    } else if (currentRoute.indexOf('promo-codes') !== -1) {
      this.activeMenu = 'marketing';
      this.expandedItems = ['marketing'];
    } else if (currentRoute.indexOf('branding') !== -1) {
      this.activeMenu = 'marketing';
      this.expandedItems = ['marketing'];
    } else if (currentRoute.indexOf('otp-configurations') !== -1) {
      this.activeMenu = 'marketing';
      this.expandedItems = ['marketing'];
    } else if (
      currentRoute.indexOf('order-list') !== -1 ||
      currentRoute.indexOf('orders-bulk-reschedule') !== -1 ||
      currentRoute.indexOf('bulk-partial-refunds') !== -1 ||
      currentRoute.indexOf('/codes') !== -1 ||
      currentRoute.indexOf('/historical-sales-import') !== -1 ||
      currentRoute.indexOf('/external-codes') !== -1
    ) {
      this.activeMenu = 'orders';
      if (
        currentRoute.indexOf('/codes') !== -1 ||
        currentRoute.indexOf('/historical-sales-import') !== -1 ||
        currentRoute.indexOf('/external-codes') !== -1
      ) {
        this.expandedItems = ['orders'];
      }
    } else if (currentRoute.indexOf('/b2b-publishing') !== -1) {
      this.activeMenu = 'b2bPublishing';
      this.expandedItems = ['b2bPublishing'];
    } else if (currentRoute.indexOf('/asset-based') !== -1) {
      this.activeMenu = 'asset-based-config';
      this.expandedItems = ['asset-based-config'];
    } else if (currentRoute.indexOf('reservations') !== -1) {
      this.activeMenu = 'reservations';
    } else if (currentRoute.indexOf('/memberships/') !== -1) {
      this.activeMenu = 'memberships';
    } else if (currentRoute.indexOf('/entitlements/') !== -1) {
      this.activeMenu = 'entitlements';
      this.expandedItems = ['entitlements'];
    } else if (currentRoute.includes('/cashless')) {
      this.activeMenu = 'cashless';
      this.expandedItems = ['cashless'];
    } else if (
      currentRoute.indexOf('affiliations') !== -1 ||
      currentRoute.indexOf('/ambassador-programs') !== -1 ||
      currentRoute.indexOf('/associates') !== -1
    ) {
      this.activeMenu = 'affiliations';
    } else if (currentRoute.indexOf('landings') !== -1) {
      this.activeMenu = 'marketing';
      this.expandedItems = ['marketing'];
    } else if (currentRoute.indexOf('faq-sets') !== -1) {
      this.activeMenu = 'marketing';
      this.expandedItems = ['marketing'];
    } else if (currentRoute.indexOf('venues') !== -1) {
      this.activeMenu = 'venues';
    } else if (currentRoute.indexOf('countries') !== -1) {
      this.activeMenu = 'countries';
    } else if (currentRoute.indexOf('cities') !== -1) {
      this.activeMenu = 'cities';
    } else if (currentRoute.indexOf('whitelabels') !== -1) {
      this.activeMenu = 'whitelabel';
      this.expandedItems = ['whitelabel'];
    } else if (currentRoute.indexOf('guest-profiles') !== -1) {
      this.activeMenu = 'guest-profiles';
      this.expandedItems = ['guest-profiles'];
    } else if (currentRoute.indexOf('fundraising') !== -1) {
      this.activeMenu = 'fundraising';
      this.expandedItems = ['fundraising'];
    } else if (isAnalyticsReportingSection(currentRoute)) {
      this.activeMenu = 'reporting';
      this.expandedItems = ['reporting'];
    } else {
      this.activeMenu = '';
      this.expandedItems = [];
    }
  }

  private getQueryParamsMap(): Map<string, Observable<SelectedPlanContext>> {
    const queryParamsMap = new Map<string, Observable<SelectedPlanContext>>();
    [
      '/plans',
      '/plans/dashboard',
      '/products/catalog-integrations',
      '/products/sales-routing',
      '/attendees',
      '/invitations',
      '/plan/detail',
      '/reviews',
      '/bundles',
      '/box-office/shifts-list',
      '/box-office/settings',
      '/order-list',
      '/orders-bulk-reschedule',
      '/bulk-partial-refunds',
      '/codes',
      '/capacity',
      '/pricing',
      '/sessions',
      '/asset-based',
      '/asset-based/calendar',
      '/asset-based/calendar-list',
      '/asset-based/hubs',
      '/box-office',
      '/reservations/list',
      '/reservations/user-list',
      '/reservations/create',
      '/reservations/deposit-settings',
      '/channels-settings',
      '/home',
      '/settings/tasks',
      '/associates',
      '/b2b-publishing/distributors',
      '/b2b-publishing/events',
      '/inventory',
      '/landings',
      '/landings/create',
      '/guest-profiles/profiles',
      '/event-settings',
      '/entitlements/list',
      '/winner-selection',
    ].forEach(url => queryParamsMap.set(url, this.#selectedPlanContextService.getQueryParamsFor(url)));
    return queryParamsMap;
  }

  private isEventsMenu(currentRoute: string): boolean {
    const eventsRoutes = [
      'plans',
      'attendees',
      'invitations',
      'plan/detail',
      'bundles',
      'capacity',
      'channels-settings',
      'sessions',
      'event-settings',
      'inventory',
      'winner-selection',
    ];
    return eventsRoutes.some(route => currentRoute.indexOf(route) !== -1);
  }
}
