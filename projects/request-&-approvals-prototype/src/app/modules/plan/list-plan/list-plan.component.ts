/* eslint-disable no-console */
import { AfterViewInit, Component, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { TranslateService } from '@ngx-translate/core';
import { takeUntil } from 'rxjs/operators';

import { LoadPlanListEvent } from '../../../core/tracking/core/events/load-plan-list';
import { ScreenTypeaheadInput, SelectOptionTypeaheadInput } from '../../../core/tracking/core/events/select-option-typeahead';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { EventSelectionBandComponent } from '../../../shared/components/event-selection-band/event-selection-band.component';
import { TableHeader } from '../../../shared/components/table/model/table-header';
import { TableOrderBy } from '../../../shared/components/table/model/table-order-by';
import { CreateEventEntryService } from '../../../shared/layout/create-event-entry/create-event-entry.service';
import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { BaseResponse } from '../../../shared/models/base-response';
import { FzAssistantHostConfig } from '../../../shared/models/fz-assistant/fz-assistant-host.model';
import { LinkPaginationResponse } from '../../../shared/models/link-pagination-response';
import { Outage } from '../../../shared/models/outage/outage.model';
import { KindOption } from '../../../shared/models/plan/kind-option.model';
import { PlanFilterOption } from '../../../shared/models/plan/plan-filter.model';
import { PlanKind } from '../../../shared/models/plan/plan-kind.enum';
import { PlanStatus } from '../../../shared/models/plan/plan-status.enum';
import { Plan } from '../../../shared/models/plan/plan.model';
import { PlansAggregatesQueryParams } from '../../../shared/models/plans-aggregates/plans-aggregates-query-params.model';
import { ScreenSize } from '../../../shared/models/screen-size';
import { FeatureFlags } from '../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../shared/optimizely/optimizely.service';
import { SearchFilter } from '../../../shared/search-bar/models/search-filter.model';
import { SearchBarComponent } from '../../../shared/search-bar/search-bar.component';
import { buildPlanListReviewStatusFilterDefinitions } from '../../../shared/search-bar/utils/plan-list-filter-options.util';
import { ReviewStatusFilterDefinition } from '../../../shared/search-bar/utils/plan-list-search-filters.util';
import { OutageService } from '../../../shared/services/outage/outage.service';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { PlanService } from '../../../shared/services/plan/plan.service';
import {
  buildPlansAggregatesQueryParams,
  plansAggregatesQueryParamsEqual,
} from '../../../shared/services/plans-aggregates/utils/build-plans-aggregates-query-params.util';
import { ReportingAccessService } from '../../../shared/services/reporting-access/reporting-access.service';
import { SelectedPlanContextService } from '../../../shared/services/selected-plan-context/selected-plan-context.service';
import { Permissions } from '../../../shared/services/user/permissions';
import { UserService } from '../../../shared/services/user/user.service';
import { trackById } from '../../../shared/utils/track-by';
import { clickGoToReporting } from '../tracking/events/click-go-to-reporting.event';
import { BaseListPlanComponent } from './base-list-plan.component';
import { CreateEventModalComponent } from './components/create-event-modal/create-event-modal.component';
import { CreateEventType } from './components/create-event-modal/create-event.model';
import { CreateEventFlowService } from './components/create-event-modal/services/create-event-flow.service';
import { DuplicatePlanNavigationContext } from './models/duplicate-plan-navigation-context.model';
import { PlanAction } from './models/plan-action.model';

@Component({
  selector: 'app-list-plan',
  standalone: false,
  styleUrls: ['./list-plan.component.scss'],
  templateUrl: './list-plan.component.html',
})
export class ListPlanComponent extends BaseListPlanComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly assistantHostConfig: FzAssistantHostConfig = {
    viewId: 'events_list',
  };
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #createEventEntryService = inject(CreateEventEntryService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #reportingAccessService = inject(ReportingAccessService);
  readonly #createEventFlowService = inject(CreateEventFlowService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #userService = inject(UserService);
  #hasLoadedFirstSearch = false;
  readonly #isMobile = this.#breakpointStateService.getStateProp('isMobile');
  #reviewStatusFilterOptions: ReadonlyArray<ReviewStatusFilterDefinition> = [];
  @ViewChild(CreateEventModalComponent) createEventModal!: CreateEventModalComponent;
  @ViewChild(SearchBarComponent) searchBar?: SearchBarComponent;
  @ViewChild(EventSelectionBandComponent) selectionBand?: EventSelectionBandComponent;
  override pageSize = 10;
  override paginatedPlans: LinkPaginationResponse<Plan[] | null> | null = null;
  override plans: Plan[] = [];
  override statusOptions: PlanFilterOption[] = [];
  override kindOptions: PlanFilterOption[] = [];
  override selectOptionTypeaheadInput = SelectOptionTypeaheadInput;
  override selectedStatus: PlanFilterOption | null = null;
  override selectedKind: KindOption | null = null;
  override planNameTyped = '';
  override planId: number | null = null;
  override placeId: number | null = null;
  override cityIdSelected: number | null = null;
  override loadingPlans = true;
  override error = false;
  override initialNextPageParam = `items_per_page=${this.pageSize}&page=1`;
  override nextPageParam = '';
  override screen = ScreenTypeaheadInput;
  override trackById = trackById;
  override orderBy: TableOrderBy | null = null;
  override defaultSearch = true;
  override partnerId = 0;
  override selectAllTranslation = 'All';
  override headers: TableHeader[] = [];
  override screenSize: ScreenSize = ScreenSize.DESKTOP;
  override innerWidth = 0;
  protected canAccessReporting = false;
  protected isCrossEventBulkEditVisible = false;
  protected isPlansListAggregatesKpiEnabled = false;
  aggregatesQueryParams: PlansAggregatesQueryParams = {};
  outage: Outage | null = null;
  canCreateEvents = false;
  readonly filtersSummary = signal('');
  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly skeletonColumns = [1, 2, 3, 4];
  readonly desktopScreenSize = ScreenSize.DESKTOP;

  constructor(
    protected partnerService: PartnerService,
    protected spinnerService: SpinnerService,
    protected translateService: TranslateService,
    protected trackingService: TrackingService,
    protected router: Router,
    protected planService: PlanService,
    protected route: ActivatedRoute,
    protected selectedPlanContextService: SelectedPlanContextService,
    protected outageService: OutageService,
  ) {
    super(partnerService, spinnerService, translateService, trackingService, router, planService, route, selectedPlanContextService);
    this.outageService.getOutages().subscribe((outagesResponse: BaseResponse<Outage[] | null>) => {
      if (outagesResponse.data) {
        this.outage = outagesResponse.data[0] ?? null;
      }
    });
  }

  override getPlans(): void {
    const selectedReviewStatusOption = this.#selectedReviewStatusOption();
    const parameters = {
      cityId: this.cityIdSelected ?? undefined,
      kind: this.selectedKind && this.selectedKind.id !== PlanKind.ALL ? this.selectedKind.id : undefined,
      name: this.planNameTyped ? this.planNameTyped : undefined,
      orderBy: this.orderBy ? [this.orderBy] : undefined,
      partnerId: this.partnerId,
      placeId: this.placeId ?? undefined,
      planId: this.planId ?? undefined,
      reviewStatus: selectedReviewStatusOption?.reviewStatuses,
      status:
        !selectedReviewStatusOption && this.selectedStatus && this.selectedStatus.id !== PlanStatus.ALL
          ? this.selectedStatus.id
          : undefined,
    };
    this.planService
      .getPlansWithAnalytics(parameters, this.nextPageParam)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (response: LinkPaginationResponse<Plan[] | null>) => {
          this.paginatedPlans = response;
          this.error = !this.paginatedPlans;
          if (this.paginatedPlans) {
            this.plans = this.filterPlansByKindPermission(this.plans.concat(this.paginatedPlans?.data ?? []));
            this.nextPageParam = this.paginatedPlans.getNextPaginationQueryString() ?? '';
          }
          this.trackingService.track(
            new LoadPlanListEvent({
              default_filter: this.defaultSearch,
              has_results: this.plans.length > 0,
              kind: this.selectedKind?.id ?? '',
              status: this.selectedStatus?.id ?? '',
              time: new Date().toISOString(),
            }),
          );
          this.loadingPlans = false;
          this.spinnerService.hide();
        },
        () => {
          this.loadingPlans = false;
          this.paginatedPlans = null;
          this.plans = [];
          this.nextPageParam = '';
          this.spinnerService.hide();
        },
      );
  }

  override loadNewSearch(searchFilter: SearchFilter): void {
    if (searchFilter.selectedPlanKind !== undefined) {
      this.selectedKind = (searchFilter.selectedPlanKind as KindOption | null) ?? null;
    }
    if (searchFilter.selectedPlanStatus !== undefined) {
      this.selectedStatus = (searchFilter.selectedPlanStatus as PlanFilterOption | null) ?? null;
    }

    super.loadNewSearch(searchFilter);
    this.#collapseFiltersOnMobile();
    this.filtersSummary.set(this.#buildFiltersSummary(searchFilter));
    this.cityIdSelected = this.cityIdSelected ?? null;
    this.placeId = this.placeId ?? null;
    this.#updateAggregatesQueryParams();
    if (searchFilter.selectedPlan && !searchFilter.selectedCity) {
      this.selectedPlanContextService.updatePlanContext(searchFilter.selectedPlan.id);
    }
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.#updateAggregatesQueryParams();
    this.isPlansListAggregatesKpiEnabled = this.#optimizelyService.isFeatureEnabled(FeatureFlags.PLANS_LIST_AGGREGATES_KPI) ?? false;
    this.#reportingAccessService
      .canAccess$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((canAccessReporting: boolean) => {
        this.canAccessReporting = canAccessReporting;
      });
    this.canCreateEvents = this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS);
    this.isCrossEventBulkEditVisible =
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.BULK_EDIT_TICKET_TYPES_CROSS_EVENT,
        team: 'b2b-inventory',
      }) === true && this.#userService.hasPermission(Permissions.CAN_MODIFY_TICKET_TYPES);
    this.#createEventEntryService.openPanelRequested$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.#handleOpenPanelSignal();
    });
    this.#createEventFlowService.openSidebarRequested$.pipe(takeUntil(this.destroy$)).subscribe((type: CreateEventType | null) => {
      if (type === null) {
        this.#openLegacySidebar();
        return;
      }
      this.#openSidebarWithType(type);
    });
  }

  protected override resolveInitialFilters(): void {
    this.#buildReviewStatusOptions();
    // Kind/status selection is owned by the search bar (`showPlanListFilters`); wait for its emission.
    this.selectedKind = null;
    this.selectedStatus = null;
  }

  override showPlans(): void {
    this.defaultSearch = false;
    this.nextPageParam = this.initialNextPageParam;
    this.paginatedPlans = null;
    this.plans = [];
    this.getPlans();
  }

  override showPlansByKind(kind?: KindOption | SelectOption | null): void {
    this.loadingPlans = true;
    this.selectedKind = kind && kind.title !== this.selectAllTranslation ? (kind as KindOption) : null;
    this.searchBar?.setPlanListFilters(this.selectedKind, this.selectedStatus);
    this.#updateAggregatesQueryParams();
    this.updateQueryParams();
    this.showPlans();
  }

  protected override preserveFiltersWhenSelectingPlan = true;

  override showPlansByStatus(status?: PlanFilterOption | SelectOption | null): void {
    this.loadingPlans = true;
    this.selectedStatus = status && status.title !== this.selectAllTranslation ? (status as PlanFilterOption) : null;
    this.searchBar?.setPlanListFilters(this.selectedKind, this.selectedStatus);
    this.#updateAggregatesQueryParams();
    this.updateQueryParams();
    this.showPlans();
  }

  protected override syncCorrectedQueryParams(): void {
    const statusMismatch = this.initialQueryStatus !== null && this.initialQueryStatus != this.selectedStatus?.id;
    const kindMismatch = this.initialQueryKind !== null && this.initialQueryKind != this.selectedKind?.id;

    if (statusMismatch || kindMismatch) {
      this.updateQueryParams();
    }
  }

  protected override updateTableHeaders(): void {
    if (this.innerWidth >= 1200) {
      this.headers = [
        {
          alignment: 'start',
          columnSize: 'calc(28% - 16px)',
          hasBorderLeft: false,
          label: 'listPlan.eventLabel',
          orderBy: 'name',
          paddingLeft: '0',
        },
        {
          alignment: 'start',
          columnSize: '10%',
          hasBorderLeft: true,
          label: 'listPlan.datesLabel',
          orderBy: 'first_session_date',
          paddingLeft: '15px',
        },
        {
          alignment: 'start',
          columnSize: '11%',
          hasBorderLeft: false,
          label: 'listPlan.kindLabel',
          orderBy: 'kind',
          paddingLeft: '15px',
        },
        {
          alignment: 'end',
          columnSize: '11%',
          hasBorderLeft: false,
          label: 'listPlan.ticketsLabel',
          orderBy: 'paid_tickets_sold',
          paddingLeft: '15px',
        },
        {
          alignment: 'end',
          columnSize: '14%',
          hasBorderLeft: false,
          label: 'listPlan.grossRevenueLabel',
          orderBy: 'gross_revenue',
          paddingLeft: '15px',
          tooltip: 'listPlan.grossRevenueInfo',
        },
        {
          alignment: 'start',
          columnSize: '14%',
          hasBorderLeft: false,
          label: 'listPlan.statusLabel',
          orderBy: 'status',
          paddingLeft: '20px',
        },
        {
          alignment: 'start',
          columnSize: '11%',
          hasBorderLeft: false,
          label: 'listPlan.visibilityLabel',
          paddingLeft: '15px',
          tooltip: 'listPlan.visibilityInfo',
        },
      ];
    } else if (this.innerWidth <= 1199.99 && this.innerWidth >= 992) {
      this.headers = [
        {
          alignment: 'start',
          columnSize: 'calc(34% - 16px)',
          hasBorderLeft: false,
          label: 'listPlan.eventLabel',
          orderBy: 'name',
          paddingLeft: '0',
        },
        {
          alignment: 'end',
          columnSize: '12%',
          hasBorderLeft: false,
          label: 'listPlan.statusLabel',
          orderBy: 'status',
          paddingLeft: '0',
        },
        {
          alignment: 'start',
          columnSize: '12%',
          hasBorderLeft: true,
          label: 'listPlan.datesLabel',
          orderBy: 'first_session_date',
          paddingLeft: '8px',
        },
        {
          alignment: 'start',
          columnSize: '13%',
          hasBorderLeft: false,
          label: 'listPlan.kindLabel',
          orderBy: 'kind',
          paddingLeft: '16px',
        },
        {
          alignment: 'end',
          columnSize: '13%',
          hasBorderLeft: false,
          label: 'listPlan.ticketsLabel',
          orderBy: 'paid_tickets_sold',
          paddingLeft: '0',
        },
        {
          alignment: 'end',
          columnSize: '13%',
          hasBorderLeft: false,
          label: 'listPlan.grossRevenueLabel',
          orderBy: 'gross_revenue',
          paddingLeft: '0',
          tooltip: 'listPlan.grossRevenueInfo',
        },
      ];
    } else if (this.innerWidth <= 991.99 && this.innerWidth >= 768) {
      this.headers = [
        {
          alignment: 'start',
          columnSize: 'calc(32% - 16px)',
          hasBorderLeft: false,
          label: 'listPlan.eventLabel',
          orderBy: 'name',
          paddingLeft: '0',
        },
        {
          alignment: 'end',
          columnSize: 'auto',
          hasBorderLeft: false,
          label: 'listPlan.statusLabel',
          orderBy: 'status',
          paddingLeft: '0',
        },
        {
          alignment: 'start',
          columnSize: '13%',
          hasBorderLeft: true,
          label: 'listPlan.datesLabel',
          orderBy: 'first_session_date',
          paddingLeft: '8px',
        },
        {
          alignment: 'start',
          columnSize: '15%',
          hasBorderLeft: false,
          label: 'listPlan.kindLabel',
          orderBy: 'kind',
          paddingLeft: '16px',
        },
        {
          alignment: 'end',
          columnSize: '13%',
          hasBorderLeft: false,
          label: 'listPlan.ticketsLabel',
          orderBy: 'paid_tickets_sold',
          paddingLeft: '0',
        },
        {
          alignment: 'end',
          columnSize: '14%',
          hasBorderLeft: false,
          label: 'listPlan.grossRevenueLabel',
          orderBy: 'gross_revenue',
          paddingLeft: '0',
          tooltip: 'listPlan.grossRevenueInfo',
        },
      ];
    } else {
      this.headers = [
        {
          alignment: 'start',
          columnSize: 'calc(100% - 105px)',
          hasBorderLeft: false,
          label: 'listPlan.eventLabel',
          orderBy: 'name',
          paddingLeft: '0',
        },
        {
          alignment: 'end',
          columnSize: 'auto',
          hasBorderLeft: false,
          label: 'listPlan.statusLabel',
          orderBy: 'status',
          paddingLeft: '0',
        },
      ];
    }
  }

  closeError(): void {
    this.error = false;
  }

  navigate(event: PlanAction): void {
    super.navigate(event);
  }

  ngAfterViewInit(): void {
    this.#consumeRouterStateOpenPanel();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  onPlanDuplicated(context: DuplicatePlanNavigationContext): void {
    void this.router.navigate(['/plans/dashboard'], { queryParams: { planId: context.duplicatedPlanId } });
  }

  updateOrderBy(field: string): void {
    super.updateOrderBy(field);
  }

  updatePlan(plan: Plan): void {
    this.plans = this.plans.map(p => (p.id === plan.id ? plan : p));
  }

  protected onGoToReportingClicked(): void {
    this.#fzTracking.track(clickGoToReporting());
  }

  #buildFiltersSummary(searchFilter: SearchFilter): string {
    const planName = searchFilter.selectedPlan?.title ?? searchFilter.typedPlan;
    if (planName) {
      return planName;
    }
    const location = [searchFilter.selectedCity?.title, searchFilter.selectedPlace?.title].filter(Boolean).join(' · ');
    return location || this.translateService.instant('filters.allEvents');
  }

  #buildReviewStatusOptions(): void {
    this.#reviewStatusFilterOptions = buildPlanListReviewStatusFilterDefinitions(this.#userService);
  }

  #clearOpenPanelRouterState(): void {
    const rest = { ...(history.state ?? {}) } as Record<string, unknown>;
    delete rest.openCreateEventPanel;
    history.replaceState(rest, '');
  }

  #collapseFiltersOnMobile(): void {
    if (this.#hasLoadedFirstSearch) {
      return;
    }
    this.#hasLoadedFirstSearch = true;
    queueMicrotask(() => {
      if (this.searchBar?.hasPreselectedFilters() === true && this.#isMobile()) {
        this.selectionBand?.fold();
      }
    });
  }

  #consumeRouterStateOpenPanel(): void {
    const state = (history.state ?? {}) as { openCreateEventPanel?: unknown };
    if (state.openCreateEventPanel !== true) {
      return;
    }
    // Defer to next microtask so `*ngIf="canCreateEvents"` + ViewChild settle
    // when navigation lands here from another route (spec §2.4 approach B).
    queueMicrotask(() => {
      if (this.canCreateEvents) {
        this.#createEventFlowService.startFlow();
      }
      this.#clearOpenPanelRouterState();
    });
  }

  #handleOpenPanelSignal(): void {
    if (!this.canCreateEvents) {
      return;
    }
    this.#createEventFlowService.startFlow();
  }

  #isReviewStatusSelected(): boolean {
    return !!this.#selectedReviewStatusOption();
  }

  #openLegacySidebar(): void {
    if (!this.canCreateEvents || !this.createEventModal) {
      return;
    }
    this.createEventModal.open();
  }

  #openSidebarWithType(type: CreateEventType): void {
    if (!this.canCreateEvents || !this.createEventModal) {
      return;
    }
    this.createEventModal.openWithType(type);
  }

  #selectedReviewStatusOption(): ReviewStatusFilterDefinition | undefined {
    const selectedId = this.selectedStatus?.id;
    if (!selectedId) {
      return undefined;
    }
    return this.#reviewStatusFilterOptions.find(option => option.id === selectedId);
  }

  #updateAggregatesQueryParams(): void {
    const nextParams = buildPlansAggregatesQueryParams({
      cityId: this.cityIdSelected,
      kind: this.selectedKind,
      name: this.planNameTyped,
      placeId: this.placeId,
      planId: this.planId,
      status: this.#isReviewStatusSelected() ? null : this.selectedStatus,
    });

    if (plansAggregatesQueryParamsEqual(this.aggregatesQueryParams, nextParams)) {
      return;
    }

    this.aggregatesQueryParams = nextParams;
  }
}
