import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LoadResellerPlanListEvent } from '../../../core/tracking/core/events/load-reseller-plan-list';
import { ScreenTypeaheadInput, SelectOptionTypeaheadInput } from '../../../core/tracking/core/events/select-option-typeahead';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { TableHeader } from '../../../shared/components/table/model/table-header';
import { TableOrderBy } from '../../../shared/components/table/model/table-order-by';
import { TableType } from '../../../shared/components/table/table.component';
import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { BaseResponse } from '../../../shared/models/base-response';
import { GraphGroup } from '../../../shared/models/graph/graph.group';
import { Graph } from '../../../shared/models/graph/graph.model';
import { LinkPaginationResponse } from '../../../shared/models/link-pagination-response';
import { Outage } from '../../../shared/models/outage/outage.model';
import { KindOption } from '../../../shared/models/plan/kind-option.model';
import { PlanFilterOption } from '../../../shared/models/plan/plan-filter.model';
import { PlanKind } from '../../../shared/models/plan/plan-kind.enum';
import { PlanStatus } from '../../../shared/models/plan/plan-status.enum';
import { Plan } from '../../../shared/models/plan/plan.model';
import { ScreenSize } from '../../../shared/models/screen-size';
import { SearchBarFilter } from '../../../shared/search-bar/enums/search-bar-filter.enum';
import { SearchFilter } from '../../../shared/search-bar/models/search-filter.model';
import { B2cSiteService } from '../../../shared/services/b2c-site/b2c-site.service';
import { OutageService } from '../../../shared/services/outage/outage.service';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { PlanService } from '../../../shared/services/plan/plan.service';
import { SelectedPlanContextService } from '../../../shared/services/selected-plan-context/selected-plan-context.service';
import { trackById } from '../../../shared/utils/track-by';
import { B2CSiteConfiguration } from '../../resellers/models/b2c-site-configuration.model';
import { BaseListPlanComponent } from '../list-plan/base-list-plan.component';
import { ShareModalComponent } from '../list-plan/components/share-modal/share-modal.component';
import { ShareNetwork } from '../list-plan/components/share-modal/share-network';
import { PlanAction } from '../list-plan/models/plan-action.model';

@Component({
  selector: 'app-reseller-list-plan',
  standalone: false,
  templateUrl: './reseller-list-plan.component.html',
  styleUrls: ['./reseller-list-plan.component.scss'],
})
export class ResellerListPlanComponent extends BaseListPlanComponent {
  readonly #feverEventsHost = 'feverup.com';
  #userService = inject(UserService);

  override pageSize = 10;
  override paginatedPlans: LinkPaginationResponse<Plan[] | null> | null = null;
  override plans: Array<Plan> = [];
  graph: Graph | null = null;

  override statusOptions: Array<PlanFilterOption> = [];
  override kindOptions: Array<PlanFilterOption> = [];
  override selectOptionTypeaheadInput = SelectOptionTypeaheadInput;
  override selectedStatus: PlanFilterOption | null = null;
  override selectedKind: KindOption | null = null;
  override planNameTyped = '';
  override planId: number | null = null;
  override placeId: number | null = null;
  override channelId: string | null = null;
  override cityIdSelected: number | null = null;
  override loadingPlans = true;
  override error = false;
  override initialNextPageParam = `items_per_page=${this.pageSize}&page=1`;
  override nextPageParam = '';
  screen = ScreenTypeaheadInput;
  override trackById = trackById;
  override orderBy: TableOrderBy | null = null;
  override defaultSearch = true;
  override partnerId = 0;
  override destroy$ = new Subject<void>();
  override selectAllTranslation = 'All';

  override headers: Array<TableHeader> = [];
  override screenSize: ScreenSize = ScreenSize.DESKTOP;
  override innerWidth = 0;
  isLIVGOLF = false;
  mandatoryFields = [SearchBarFilter.channel];

  selectedB2cSiteConfiguration: B2CSiteConfiguration | null = null;
  eventSiteLink: string | null = null;
  outage: Outage | null = null;

  protected readonly GraphGroup = GraphGroup;
  protected readonly Permissions = Permissions;

  constructor(
    protected partnerService: PartnerService,
    protected spinnerService: SpinnerService,
    protected translateService: TranslateService,
    protected trackingService: TrackingService,
    protected router: Router,
    protected planService: PlanService,
    protected route: ActivatedRoute,
    protected selectedPlanContextService: SelectedPlanContextService,
    private b2cSiteService: B2cSiteService,
    private modalService: NgbModal,
    private translate: TranslateService,
    protected outageService: OutageService,
  ) {
    super(partnerService, spinnerService, translateService, trackingService, router, planService, route, selectedPlanContextService);
    this.outageService.getOutages().subscribe((outagesResponse: BaseResponse<Outage[] | null>) => {
      if (outagesResponse.data) {
        this.outage = outagesResponse.data[0] ?? null;
      }
    });
  }

  protected TableType = TableType;

  loadNewSearch(searchFilter: SearchFilter): void {
    super.loadNewSearch(searchFilter);
    if (searchFilter.selectedPlan && !searchFilter.selectedCity) {
      this.selectedPlanContextService.updatePlanContext(searchFilter.selectedPlan?.id, undefined, searchFilter.selectedChannel?.id);
    }
    this.setEventSiteLink();
  }

  updateOrderBy(field: string): void {
    super.updateOrderBy(field);
  }

  filterBy(event: { field: string; option: SelectOption }): void {
    if (event.field === 'status') {
      this.showPlansByStatus(event.option);
      return;
    }
  }

  override getPlans(): void {
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
      channelId: this.channelId ?? undefined,
    };
    this.planService
      .getResellerPlansPaginated(this.partnerId, parameters, this.nextPageParam)
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
            new LoadResellerPlanListEvent({
              time: new Date().toISOString(),
              default_filter: this.defaultSearch,
              status: this.selectedStatus?.id ?? '',
              resseller_category: this.#userService.hasPermission(Permissions.CAN_VIEW_AMBASSADOR_DASHBOARD) ? 'ambassador' : 'affiliate',
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

  override showPlans(): void {
    this.defaultSearch = false;
    this.nextPageParam = this.initialNextPageParam;
    this.paginatedPlans = null;
    this.plans = [];
    this.getPlans();
  }

  override showPlansByStatus(status: PlanFilterOption | SelectOption): void {
    this.loadingPlans = true;
    this.selectedStatus = status.title !== this.selectAllTranslation ? (status as PlanFilterOption) : null;
    super.updateQueryParams();
    this.showPlans();
  }

  override showPlansByKind(kind: KindOption | SelectOption): void {
    this.loadingPlans = true;
    this.selectedKind = kind.title !== this.selectAllTranslation ? (kind as KindOption) : null;
    super.updateQueryParams();
    this.showPlans();
  }

  navigate(event: PlanAction): void {
    super.navigate(event);
  }

  updatePlanContext(planId: number): void {
    this.selectedPlanContextService.updatePlanContext(planId, this.cityIdSelected ?? undefined, this.channelId ?? undefined);
  }

  closeError(): void {
    this.error = false;
  }

  openB2cSite(): void {
    if (this.eventSiteLink) {
      window.open(this.eventSiteLink, '_blank');
    }
  }

  shareB2CSiteModal(): void {
    const modal = this.modalService.open(ShareModalComponent);
    const component: ShareModalComponent = modal.componentInstance;
    component.link = (_network: ShareNetwork) => this.eventSiteLink ?? '';
    component.message = `${this.translate.instant('listPlan.trackingLink.shareModal.message')}`;
  }

  protected updateTableHeaders(): void {
    if (this.innerWidth >= 1200) {
      this.headers = [
        {
          label: 'listPlan.eventLabel',
          columnSize: 'calc(50% - 16px)',
          orderBy: 'name',
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '0',
        },
        {
          label: 'listPlan.datesLabel',
          columnSize: '12%',
          orderBy: 'first_session_date',
          hasBorderLeft: true,
          alignment: 'start',
          paddingLeft: '15px',
        },
        {
          label: 'listPlan.statusLabel',
          columnSize: '10%',
          orderBy: 'status',
          filterBy: 'status',
          filterByOptions: this.statusOptions,
          filterBySelected: this.selectedStatus ?? undefined,
          hasBorderLeft: false,
          alignment: 'start',
          paddingLeft: '25px',
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

  setEventSiteLink(): void {
    if (!this.cityIdSelected) {
      this.eventSiteLink = null;
      return;
    }

    const affiliateId: number | null | undefined = this.#userService.hasPermission(Permissions.CAN_EDIT_NOTIFICATIONS)
      ? null
      : this.#userService.getUserId();
    if (affiliateId === undefined) {
      this.eventSiteLink = null;
      return;
    }

    this.b2cSiteService
      .getB2cSiteConfigurations(this.partnerId, affiliateId ?? undefined, true, this.cityIdSelected)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.error || !response.data || !response.data.length) {
            this.eventSiteLink = null;
            return;
          }

          const b2cSiteConfigurations = response.data as B2CSiteConfiguration[];
          const b2cSiteConfiguration = b2cSiteConfigurations?.[0];
          if (!b2cSiteConfiguration || b2cSiteConfiguration.host === this.#feverEventsHost) {
            this.eventSiteLink = null;
            return;
          }

          this.eventSiteLink = b2cSiteConfiguration.affiliateCatalogViewUrl ?? null;
        },
        error: () => {
          this.eventSiteLink = null;
        },
      });
  }
}
