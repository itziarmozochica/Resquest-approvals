import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ClickViewInFeverEvent } from '../../../core/tracking/core/events/click-view-in-fever';
import { LoadPlanListEvent } from '../../../core/tracking/core/events/load-plan-list';
import { PlanMoreInfoEvent } from '../../../core/tracking/core/events/plan-more-info';
import { ScreenTypeaheadInput, SelectOptionTypeaheadInput } from '../../../core/tracking/core/events/select-option-typeahead';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { TableHeader } from '../../../shared/components/table/model/table-header';
import { TableOrderBy } from '../../../shared/components/table/model/table-order-by';
import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { LinkPaginationResponse } from '../../../shared/models/link-pagination-response';
import { KindOption } from '../../../shared/models/plan/kind-option.model';
import { PlanFilterOption } from '../../../shared/models/plan/plan-filter.model';
import { PLAN_KIND_PERMISSIONS } from '../../../shared/models/plan/plan-kind-permissions.config';
import { PlanKind } from '../../../shared/models/plan/plan-kind.enum';
import { PlanStatus } from '../../../shared/models/plan/plan-status.enum';
import { Plan } from '../../../shared/models/plan/plan.model';
import { ScreenSize } from '../../../shared/models/screen-size';
import { SearchFilter } from '../../../shared/search-bar/models/search-filter.model';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { PlanEditionLockService } from '../../../shared/services/plan-review/plan-edition-lock.service';
import { PlanService } from '../../../shared/services/plan/plan.service';
import { SelectedPlanContextService } from '../../../shared/services/selected-plan-context/selected-plan-context.service';
import { Permissions } from '../../../shared/services/user/permissions';
import { trackById } from '../../../shared/utils/track-by';
import { PlanAction } from './models/plan-action.model';
import { PlanNavigateToSection } from './models/plan-navigate-to-section.model';

@Component({
  standalone: false,
  template: '',
})
export abstract class BaseListPlanComponent implements OnInit, OnDestroy {
  pageSize = 10;
  paginatedPlans: LinkPaginationResponse<Plan[] | null> | null = null;
  plans: Plan[] = [];
  statusOptions: PlanFilterOption[] = [];
  kindOptions: PlanFilterOption[] = [];
  selectOptionTypeaheadInput = SelectOptionTypeaheadInput;
  selectedStatus: PlanFilterOption | null = null;
  selectedKind: KindOption | null = null;
  planNameTyped = '';
  planId: number | null = null;
  placeId: number | null = null;
  channelId: string | null = null;
  cityIdSelected: number | null = null;
  loadingPlans = true;
  error = false;
  initialNextPageParam = `items_per_page=${this.pageSize}&page=1`;
  nextPageParam = '';
  screen = ScreenTypeaheadInput;
  trackById = trackById;
  orderBy: TableOrderBy | null = null;
  defaultSearch = true;
  partnerId = 0;
  destroy$ = new Subject<void>();
  selectAllTranslation = 'All';
  headers: TableHeader[] = [];
  screenSize: ScreenSize = ScreenSize.DESKTOP;
  innerWidth = 0;
  protected initialQueryStatus: string | null = null;
  protected initialQueryKind: string | null = null;

  readonly #planEditionLockService = inject(PlanEditionLockService);
  #userService = inject(UserService);

  constructor(
    protected partnerService: PartnerService,
    protected spinnerService: SpinnerService,
    protected translateService: TranslateService,
    protected trackingService: TrackingService,
    protected router: Router,
    protected planService: PlanService,
    protected route: ActivatedRoute,
    protected selectedPlanContextService: SelectedPlanContextService,
  ) {}

  ngOnInit(): void {
    this.spinnerService.show();
    this.partnerId = this.partnerService.getPartner()?.id ?? 0;
    this.selectAllTranslation = this.translateService.instant('common.all');
    this.buildStatusOptions();
    this.buildKindOptions();
    this.initialQueryStatus = this.route.snapshot.queryParamMap.get('status');
    this.selectedStatus =
      this.statusOptions.find(option => option.id == this.initialQueryStatus) ??
      this.statusOptions.find(option => option.id === PlanStatus.ON_SALE) ??
      null;
    this.initialQueryKind = this.route.snapshot.queryParamMap.get('kind');
    if (this.initialQueryKind) {
      this.selectedKind = this.kindOptions.find(option => option.id == this.initialQueryKind) ?? null;
    }
    this.calculateResizeParams();
    this.resolveInitialFilters();
  }

  protected resolveInitialFilters(): void {
    this.syncCorrectedQueryParams();
  }

  protected preserveFiltersWhenSelectingPlan = false;

  protected shouldApplyPlanFiltersFromSelectedPlan(searchFilter: SearchFilter): boolean {
    if (this.preserveFiltersWhenSelectingPlan) {
      return false;
    }
    return Boolean(searchFilter.selectedPlan && searchFilter.selectedPlan.id !== this.planId);
  }

  protected syncCorrectedQueryParams(): void {
    const statusMismatch = this.initialQueryStatus !== null && this.initialQueryStatus != this.selectedStatus?.id;
    const kindMismatch = this.initialQueryKind !== null && this.initialQueryKind != this.selectedKind?.id;
    if (statusMismatch || kindMismatch) {
      this.updateQueryParams();
    }
  }

  loadNewSearch(searchFilter: SearchFilter): void {
    this.defaultSearch = searchFilter.isDefaultFilter;
    this.#planEditionLockService.loadForPlan(searchFilter.selectedPlan?.id ?? null);
    if (this.shouldApplyPlanFiltersFromSelectedPlan(searchFilter)) {
      const statusOption = this.statusOptions.filter(option => searchFilter.selectedPlan?.status == option.id);
      const kindOption = this.kindOptions.filter(option => searchFilter.selectedPlan?.kind == option.id);
      this.selectedStatus = statusOption[0] ?? null;
      this.selectedKind = kindOption[0] ?? null;
    }
    this.nextPageParam = this.initialNextPageParam;
    this.plans = [];
    this.orderBy = null;
    this.loadingPlans = true;
    this.planId = searchFilter.selectedPlan?.id;
    this.planNameTyped = searchFilter.typedPlan ?? '';
    this.cityIdSelected = searchFilter.selectedCity?.id;
    this.placeId = searchFilter.selectedPlace?.id;
    this.channelId = searchFilter.selectedChannel?.id;
    this.updateTableHeaders();
    this.getPlans();
  }

  updateOrderBy(field: string): void {
    this.nextPageParam = this.initialNextPageParam;
    this.plans = [];
    this.loadingPlans = true;

    if (!this.orderBy) {
      this.orderBy = { field, direction: 'desc' };
      this.getPlans();
      return;
    }

    if (this.orderBy.field === field && this.orderBy.direction === 'asc') {
      this.orderBy = { field, direction: 'desc' };
      this.getPlans();
      return;
    }

    this.orderBy = { field, direction: 'asc' };
    this.getPlans();
  }

  filterBy(event: { field: string; option: SelectOption }): void {
    if (event.field === 'status') {
      this.showPlansByStatus(event.option);
      return;
    }
    this.showPlansByKind(event.option);
  }
  getPlans(): void {
    this.destroy$.next();
    const parameters = {
      partnerId: this.partnerId,
      status: this.selectedStatus && this.selectedStatus.id !== PlanStatus.ALL ? this.selectedStatus.id : undefined,
      kind: this.selectedKind && this.selectedKind.id !== PlanKind.ALL ? this.selectedKind.id : undefined,
      planId: this.planId ?? undefined,
      placeId: this.placeId ?? undefined,
      name: this.planNameTyped ? this.planNameTyped : undefined,
      cityId: this.cityIdSelected ?? undefined,
      orderBy: this.orderBy ? [this.orderBy] : undefined,
    };
    this.planService
      .getPlansWithAnalytics(parameters, this.nextPageParam)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (response: LinkPaginationResponse<Plan[] | null>) => {
          this.paginatedPlans = response;
          this.error = !this.paginatedPlans;
          if (this.paginatedPlans) {
            this.plans = this.filterPlansByKindPermission(this.plans.concat(this.paginatedPlans.data ?? []));
            this.nextPageParam = this.paginatedPlans.getNextPaginationQueryString() ?? '';
          }
          this.trackingService.track(
            new LoadPlanListEvent({
              time: new Date().toISOString(),
              default_filter: this.defaultSearch,
              status: this.selectedStatus?.id ?? '',
              kind: this.selectedKind?.id ?? '',
              has_results: this.plans.length > 0,
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

  protected filterPlansByKindPermission(plans: Plan[]): Plan[] {
    return plans.filter(plan => {
      const requiredPermission = plan.kind ? PLAN_KIND_PERMISSIONS[plan.kind]?.view : undefined;
      return (
        !requiredPermission ||
        this.#userService.hasPermission(requiredPermission) ||
        this.#userService.hasPermission('can_manage_plan_reviews')
      );
    });
  }

  showPlans(): void {
    this.defaultSearch = false;
    this.nextPageParam = this.initialNextPageParam;
    this.paginatedPlans = null;
    this.plans = [];
    this.getPlans();
  }

  showPlansByStatus(status: PlanFilterOption | SelectOption): void {
    this.loadingPlans = true;
    this.selectedStatus = status.title !== this.selectAllTranslation ? (status as PlanFilterOption) : null;
    this.updateQueryParams();
    this.showPlans();
  }

  showPlansByKind(kind: KindOption | SelectOption): void {
    this.loadingPlans = true;
    this.selectedKind = kind.title !== this.selectAllTranslation ? (kind as KindOption) : null;
    this.updateQueryParams();
    this.showPlans();
  }

  navigate(event: PlanAction): void {
    if (event.navigateTo === PlanNavigateToSection.feverPage) {
      this.trackingService.track(new ClickViewInFeverEvent({ plan_id: event.plan.id ?? 0 }));
      window.open(event.trackingLink ? `https://${event.trackingLink}` : `https://feverup.com/m/${event.plan.id}`, '_blank');
      return;
    }

    this.trackingService.track(
      new PlanMoreInfoEvent({
        id: event.plan.id ?? 0,
        name: event.plan.name ?? '',
        source: event.source ?? '',
        navigate_to: event.navigateTo ?? '',
      }),
    );
    if (event.plan.id !== undefined) {
      this.updatePlanContext(event.plan.id);
    }
    this.router.navigate(event.commands ?? [], event.extras);
  }

  updatePlanContext(planId: number): void {
    this.selectedPlanContextService.updatePlanContext(planId, this.cityIdSelected ?? 0);
  }

  closeError(): void {
    this.error = false;
  }

  @HostListener('window:scroll', ['$event'])
  loadMore(): void {
    if (this.loadingPlans) {
      return;
    }
    if (this.plans.length === 0) {
      return;
    }
    const pos = (document.documentElement.scrollTop || document.body.scrollTop) + document.documentElement.offsetHeight;
    const max = document.documentElement.scrollHeight;
    if (pos + 1000 >= max) {
      if (this.nextPageParam) {
        this.loadingPlans = true;
        this.getPlans();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  private buildStatusOptions(): void {
    Object.keys(PlanStatus).forEach((key: string) => {
      const selectOption: PlanFilterOption = {
        id: PlanStatus[key as keyof typeof PlanStatus],
        title: key == 'ALL' ? this.selectAllTranslation : this.translateService.instant(`filters.${key.toLocaleLowerCase()}Events`),
      };
      this.statusOptions = [...this.statusOptions, selectOption];
    });
  }

  private buildKindOptions(): void {
    const kindConfigs: Array<{
      key: string;
      kind: PlanKind;
      permission?: Permissions;
    }> = [
      { key: 'ALL', kind: PlanKind.ALL },
      { key: 'STANDARD', kind: PlanKind.STANDARD },
      { key: 'TIMELESS', kind: PlanKind.TIMELESS },
      { key: 'WAITLIST', kind: PlanKind.WAITLIST, permission: Permissions.CAN_VIEW_WAITLISTS },
      { key: 'AUCTION', kind: PlanKind.AUCTION, permission: Permissions.CAN_VIEW_AUCTIONS },
      { key: 'GIFT_CARD', kind: PlanKind.GIFT_CARD },
      { key: 'GIVEAWAY', kind: PlanKind.GIVEAWAY },
      { key: 'LINK_OUT', kind: PlanKind.LINK_OUT, permission: Permissions.CAN_VIEW_LINK_OUTS },
      { key: 'MOVIE', kind: PlanKind.MOVIE },
      {
        key: 'PRIZE_DRAW',
        kind: PlanKind.PRIZE_DRAW,
        permission: Permissions.CAN_VIEW_PRIZE_DRAWS,
      },
      { key: 'REDEEM_NOW', kind: PlanKind.REDEEM_NOW, permission: Permissions.CAN_VIEW_REDEEM_NOW },
      { key: 'SHOWCASE', kind: PlanKind.SHOWCASE, permission: Permissions.CAN_VIEW_SHOWCASE },
    ];

    const types: PlanFilterOption[] = kindConfigs
      .filter(config => !(config.permission && !this.#userService.hasPermission(config.permission)))
      .map(config => {
        const camelCaseKey = this.toCamelCase(config.key);
        return {
          id: config.kind,
          title: config.key === 'ALL' ? this.selectAllTranslation : this.translateService.instant(`filters.${camelCaseKey}Events`),
        };
      });

    this.kindOptions = types;
  }

  protected updateQueryParams(): void {
    const queryParams: Record<string, string | undefined> = {
      status: this.selectedStatus?.id,
      kind: this.selectedKind?.id,
    };
    this.changeQueryParams(queryParams);
  }

  private changeQueryParams(newQueryParams: Record<string, string | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: newQueryParams,
      queryParamsHandling: 'merge',
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.calculateResizeParams();
    this.updateTableHeaders();
  }

  protected calculateResizeParams(): void {
    this.innerWidth = window.innerWidth;
    if (this.innerWidth >= 1200) {
      this.screenSize = ScreenSize.DESKTOP;
    } else if (this.innerWidth <= 1199.99 && this.innerWidth >= 992) {
      this.screenSize = ScreenSize.TABLET;
    } else if (this.innerWidth <= 991.99 && this.innerWidth >= 768) {
      this.screenSize = ScreenSize.TABLET;
    } else {
      this.screenSize = ScreenSize.MOBILE;
    }
  }

  private toCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  protected updateTableHeaders(): void {
    if (this.innerWidth >= 1200) {
      this.headers = [
        {
          label: 'listPlan.eventLabel',
          columnSize: 'calc(28% - 16px)',
          orderBy: 'name',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: 'listPlan.datesLabel',
          columnSize: '10%',
          orderBy: 'first_session_date',
          hasBorderLeft: true,
          alignment: 'start',
          paddingLeft: '15px',
        },
        {
          label: 'listPlan.kindLabel',
          columnSize: '11%',
          orderBy: 'kind',
          filterBy: 'kind',
          filterByOptions: this.kindOptions,
          filterBySelected: this.selectedKind ?? undefined,
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '15px',
        },
        {
          label: 'listPlan.ticketsLabel',
          columnSize: '11%',
          orderBy: 'paid_tickets_sold',
          hasBorderLeft: false,
          alignment: 'end',
          paddingLeft: '15px',
        },
        {
          label: 'listPlan.grossRevenueLabel',
          columnSize: '14%',
          orderBy: 'gross_revenue',
          hasBorderLeft: false,
          tooltip: 'listPlan.grossRevenueInfo',
          alignment: 'end',
          paddingLeft: '15px',
        },
        {
          label: 'listPlan.statusLabel',
          columnSize: '14%',
          orderBy: 'status',
          filterBy: 'status',
          filterByOptions: this.statusOptions,
          filterBySelected: this.selectedStatus ?? undefined,
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '20px',
        },
        {
          label: 'listPlan.visibilityLabel',
          columnSize: '11%',
          hasBorderLeft: false,
          tooltip: 'listPlan.visibilityInfo',
          alignment: 'start',
          paddingLeft: '15px',
        },
      ];
    } else if (this.innerWidth <= 1199.99 && this.innerWidth >= 992) {
      this.headers = [
        {
          label: 'listPlan.eventLabel',
          columnSize: 'calc(34% - 16px)',
          orderBy: 'name',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: 'listPlan.statusLabel',
          columnSize: '12%',
          orderBy: 'status',
          filterBy: 'status',
          filterByOptions: this.statusOptions,
          filterBySelected: this.selectedStatus ?? undefined,
          hasBorderLeft: false,
          alignment: 'end',
          paddingLeft: '0',
        },
        {
          label: 'listPlan.datesLabel',
          columnSize: '12%',
          orderBy: 'first_session_date',
          hasBorderLeft: true,
          alignment: 'start',
          paddingLeft: '8px',
        },
        {
          label: 'listPlan.kindLabel',
          columnSize: '13%',
          orderBy: 'kind',
          filterBy: 'kind',
          filterByOptions: this.kindOptions,
          filterBySelected: this.selectedKind ?? undefined,
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '16px',
        },
        {
          label: 'listPlan.ticketsLabel',
          columnSize: '13%',
          orderBy: 'paid_tickets_sold',
          hasBorderLeft: false,
          alignment: 'end',
          paddingLeft: '0',
        },
        {
          label: 'listPlan.grossRevenueLabel',
          columnSize: '13%',
          orderBy: 'gross_revenue',
          hasBorderLeft: false,
          tooltip: 'listPlan.grossRevenueInfo',
          alignment: 'end',
          paddingLeft: '0',
        },
      ];
    } else if (this.innerWidth <= 991.99 && this.innerWidth >= 768) {
      this.headers = [
        {
          label: 'listPlan.eventLabel',
          columnSize: 'calc(32% - 16px)',
          orderBy: 'name',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: 'listPlan.statusLabel',
          columnSize: 'auto',
          orderBy: 'status',
          filterBy: 'status',
          filterByOptions: this.statusOptions,
          filterBySelected: this.selectedStatus ?? undefined,
          hasBorderLeft: false,
          alignment: 'end',
          paddingLeft: '0',
        },
        {
          label: 'listPlan.datesLabel',
          columnSize: '13%',
          orderBy: 'first_session_date',
          hasBorderLeft: true,
          alignment: 'start',
          paddingLeft: '8px',
        },
        {
          label: 'listPlan.kindLabel',
          columnSize: '15%',
          orderBy: 'kind',
          filterBy: 'kind',
          filterByOptions: this.kindOptions,
          filterBySelected: this.selectedKind ?? undefined,
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '16px',
        },
        {
          label: 'listPlan.ticketsLabel',
          columnSize: '13%',
          orderBy: 'paid_tickets_sold',
          hasBorderLeft: false,
          alignment: 'end',
          paddingLeft: '0',
        },
        {
          label: 'listPlan.grossRevenueLabel',
          columnSize: '14%',
          orderBy: 'gross_revenue',
          hasBorderLeft: false,
          tooltip: 'listPlan.grossRevenueInfo',
          alignment: 'end',
          paddingLeft: '0',
        },
      ];
    } else {
      this.headers = [
        {
          label: 'listPlan.eventLabel',
          columnSize: 'calc(100% - 105px)',
          orderBy: 'name',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: 'listPlan.statusLabel',
          columnSize: 'auto',
          orderBy: 'status',
          filterBy: 'status',
          filterByOptions: this.statusOptions,
          filterBySelected: this.selectedStatus ?? undefined,
          hasBorderLeft: false,
          alignment: 'end',
          paddingLeft: '0',
        },
      ];
    }
  }
}
