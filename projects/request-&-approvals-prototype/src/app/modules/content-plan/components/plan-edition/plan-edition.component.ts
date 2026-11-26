import { Component, computed, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { EMPTY, merge, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, filter, switchMap, takeUntil, tap } from 'rxjs/operators';

import { ScreenTypeaheadInput } from '../../../../core/tracking/core/events/select-option-typeahead';
import { SelectOption } from '../../../../shared/layout/filters/select/select.interface';
import { BaseResponse } from '../../../../shared/models/base-response';
import { MobileOS } from '../../../../shared/models/device/device.model';
import { FzAssistantHostConfig } from '../../../../shared/models/fz-assistant/fz-assistant-host.model';
import { PlanDetail } from '../../../../shared/models/plan/plan-detail.model';
import {
  implementsUnsavedChangesGuard,
  WithUnsavedChangesGuardComponent,
} from '../../../../shared/models/with-unsaved-changes-guard-component.model';
import { SearchBarFilter } from '../../../../shared/search-bar/enums/search-bar-filter.enum';
import { SearchFilter } from '../../../../shared/search-bar/models/search-filter.model';
import { SearchBarService } from '../../../../shared/search-bar/service/search-bar.service';
import { DeviceService } from '../../../../shared/services/device/device.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { PlanEditionLockService } from '../../../../shared/services/plan-review/plan-edition-lock.service';
import { PlanDetailService } from '../../../../shared/services/plan/plan-detail.service';
import { trackById } from '../../../../shared/utils/track-by';
import { planRequiresTermsAndConditions } from '../../../plan/plan-creation/components/utils/plan-content-completion.util';
import { ContentPlanTabsResolver } from '../../content-plan-tabs.resolver';
import { EditingPlanService } from '../../services/editing-plan/editing-plan.service';
import { PlanThemedUrlService } from '../../services/plan-themed-url/plan-themed-url.service';

enum PlanEditionTabEnum {
  Content = 'Content',
  ImmersivePlanLayout = 'ImmersivePlanLayout',
  Metadata = 'Metadata',
  Tags = 'Tags',
  Gallery = 'Gallery',
  TermsAndConditions = 'TermsAndConditions',
  Venue = 'Venue',
  Translations = 'Translations',
}

const ROUTE_SEGMENT_TO_TAB_ENUM: Record<string, PlanEditionTabEnum> = {
  'content-edit': PlanEditionTabEnum.Content,
  'gallery-edit': PlanEditionTabEnum.Gallery,
  'immersive-plan-layout-edit': PlanEditionTabEnum.ImmersivePlanLayout,
  'metadata-edit': PlanEditionTabEnum.Metadata,
  'tags-edit': PlanEditionTabEnum.Tags,
  'terms-and-conditions-edit': PlanEditionTabEnum.TermsAndConditions,
  'translations-edit': PlanEditionTabEnum.Translations,
  'venue-edit': PlanEditionTabEnum.Venue,
};

const METADATA_TAB_ID = 'metadata-edit';

interface PlanEditionTab {
  id: string;
  link: string;
  label: string;
  tabEnum: PlanEditionTabEnum;
}

@Component({
  selector: 'app-plan-edition',
  standalone: false,
  styleUrl: './plan-edition.component.scss',
  templateUrl: './plan-edition.component.html',
})
export class PlanEditionComponent implements OnDestroy {
  readonly assistantHostConfig: FzAssistantHostConfig = {
    viewId: 'events_content',
  };
  readonly #contentPlanTabsResolver = inject(ContentPlanTabsResolver);
  readonly #deviceService = inject(DeviceService);
  protected readonly editingPlan = inject(EditingPlanService);
  readonly #partnerService = inject(PartnerService);
  readonly #planDetailService = inject(PlanDetailService);
  readonly #planEditionLockService = inject(PlanEditionLockService);
  readonly #planThemedUrlService = inject(PlanThemedUrlService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #searchBarService = inject(SearchBarService);

  protected readonly planEditionIsLockedForEdition = this.#planEditionLockService.isLockedForEdition;
  protected readonly planEditionLockResolved = this.#planEditionLockService.lockResolved;
  protected readonly planEditionShowLockedBanner = this.#planEditionLockService.showLockedBanner;

  get selectedPlanDetail(): Partial<PlanDetail> {
    return this._selectedPlanDetail;
  }

  set selectedPlanDetail(value: Partial<PlanDetail>) {
    this._selectedPlanDetail = value;
    this.updateTabs();
  }

  mandatoryFilters = [SearchBarFilter.city, SearchBarFilter.plan];
  screen = ScreenTypeaheadInput;
  showCompatibilityNote = false;
  protected isPlanDetailSettled = false;
  readonly #activeTabId = signal<string | null>(this.#route.firstChild?.routeConfig?.path ?? null);
  readonly #tabs = signal<PlanEditionTab[]>([]);
  readonly tabs = this.#tabs.asReadonly();
  protected readonly selectedTabIndex = computed(() => this.#tabs().findIndex(tab => tab.id === this.#activeTabId()));
  readonly #selectedPlanTitle = signal<string | null>(null);
  protected readonly selectedPlanTitle = this.#selectedPlanTitle.asReadonly();
  protected readonly tabsComponent = viewChild(IgntTabsComponent);
  trackById = trackById;

  #activeTab: WithUnsavedChangesGuardComponent | null = null;

  onTabActivate(component: unknown): void {
    this.#activeTab = implementsUnsavedChangesGuard(component) ? component : null;
    this.#activeTabId.set(this.#route.firstChild?.routeConfig?.path ?? null);
  }

  onTabDeactivate(): void {
    this.#activeTab = null;
  }

  activeTabHasUnsavedChanges = (): boolean => this.#activeTab?.areChangesUnsaved() ?? false;

  private _selectedPlanDetail: Partial<PlanDetail> = {};

  private filtersSelectedPlan = new Subject<SelectOption | null>();
  private destroy$ = new Subject<void>();

  constructor() {
    this.updateTabs();

    merge(this.filtersSelectedPlan.pipe(distinctUntilChanged((a, b) => a?.id === b?.id)), this.editingPlan.getSelectedPlanChanged$())
      .pipe(
        tap((selectedPlan: SelectOption | null) => {
          this.#planEditionLockService.loadForPlan(selectedPlan?.id ?? null);
          this.editingPlan.setSelectedPlanDetail(new BaseResponse(null as any, null));
          this.editingPlan.setSelectedPlanOption(selectedPlan as SelectOption);
          this.selectedPlanDetail = {};
          this.isPlanDetailSettled = false;
        }),
        filter(Boolean),
        switchMap((selectedPlan: SelectOption) => this.getPlanDetailResponse(selectedPlan.id)),
        takeUntil(this.destroy$),
      )
      .subscribe();

    this.#route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (!params.cityId || !params.planId) {
        this.loadNewSearch({ selectedPlan: null } as unknown as SearchFilter);
      }
    });

    const galleryTab = this.#tabs().find(tab => tab.tabEnum === PlanEditionTabEnum.Gallery);
    this.showCompatibilityNote =
      this.#deviceService.getDeviceOS() == MobileOS.iOS && !!galleryTab && this.#router.url.includes(galleryTab.link);
  }

  changeTab(tabSelected: PlanEditionTabEnum): void {
    this.showCompatibilityNote = this.#deviceService.getDeviceOS() == MobileOS.iOS && tabSelected == PlanEditionTabEnum.Gallery;
  }

  loadNewSearch({ selectedPlan }: SearchFilter): void {
    this.#selectedPlanTitle.set(selectedPlan?.title ?? null);
    this.filtersSelectedPlan.next(selectedPlan ?? null);
  }

  protected onTabIndexChange(index: number): void {
    const tab = index < 0 ? undefined : this.#tabs().at(index);
    if (!tab || tab.id === this.#activeTabId()) {
      return;
    }

    this.changeTab(tab.tabEnum);
    void this.#router.navigate([tab.link], { queryParamsHandling: 'preserve', relativeTo: this.#route }).then(navigated => {
      if (!navigated) {
        this.tabsComponent()?.changeSelectedIndex(this.selectedTabIndex());
      }
    });
  }

  ngOnDestroy(): void {
    this.editingPlan.reset();
    this.destroy$.next();
  }

  private moveToAvailableTab(): void {
    const activeTabPath = this.#route.firstChild?.routeConfig?.path;
    const isOnPlanEditionShell = activeTabPath === '';
    const isOnUnavailableMetadataTab = activeTabPath === METADATA_TAB_ID && !this.#tabs().some(tab => tab.id === METADATA_TAB_ID);

    if (!isOnPlanEditionShell && !isOnUnavailableMetadataTab) {
      return;
    }

    const firstTab = this.#tabs().at(0);
    if (firstTab === undefined && isOnPlanEditionShell) {
      return;
    }

    void this.#router.navigate([firstTab?.link ?? '.'], { queryParamsHandling: 'preserve', relativeTo: this.#route });
  }

  private updateTabs(): void {
    const showVenueTab = this.selectedPlanDetail?.venues?.length === 1;
    const planRequiringTermsAndConditions = planRequiresTermsAndConditions({ type: this.selectedPlanDetail?.type ?? '' });
    const isCandlelight = this.selectedPlanDetail?.isCandlelight === true;
    const tabsOptions = { isCandlelight, planRequiringTermsAndConditions, showVenueTab };
    this.#tabs.set(
      this.#contentPlanTabsResolver.getAvailableTabs(tabsOptions).map(tab => {
        const tabEnum = ROUTE_SEGMENT_TO_TAB_ENUM[tab.id];
        if (!tabEnum) {
          throw new Error(`Unknown tab id: ${tab.id}. Add it to ROUTE_SEGMENT_TO_TAB_ENUM.`);
        }
        return { id: tab.id, label: tab.label, link: tab.id, tabEnum };
      }),
    );
  }

  private getThemedUrlResponse(partnerId: number, planId: number) {
    return this.#planThemedUrlService.getThemedUrl(partnerId, planId).pipe(catchError(() => of(null)));
  }

  private getHeaderPlanDetail(planDetail?: PlanDetail): Partial<PlanDetail> {
    const selectedOption = this.editingPlan.getSelectedPlanOption();
    const partnerId = this.#partnerService.getPartner()?.id;

    return {
      ...(planDetail ?? {}),
      id: this.editingPlan.getSelectedPlanOption().id,
      name: planDetail?.name ?? selectedOption?.title,
      partnerId: partnerId,
      themedUrl: planDetail?.themedUrl,
    };
  }

  private updateSearchBar() {
    const currentOption = this.editingPlan.getSelectedPlanOption();
    const currentDetail = this.editingPlan.getSelectedPlanDetail()?.data;
    const partnerId = this.#partnerService.getPartner()?.id;

    if (currentDetail?.name && currentOption?.title !== currentDetail.name && partnerId) {
      this.#searchBarService.updatePartnerPlanOptionName(partnerId, currentOption.id, currentDetail.name);
    }
  }

  private getPlanDetailResponse(planId: number) {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (!partnerId) {
      return EMPTY;
    }
    return this.#planDetailService.getPlanDetail(partnerId, planId).pipe(
      tap((plan: PlanDetail) => {
        this.editingPlan.setSelectedPlanDetail(new BaseResponse(plan, null));
        this.isPlanDetailSettled = true;
        this.selectedPlanDetail = this.getHeaderPlanDetail(plan);
        this.updateSearchBar();
        this.moveToAvailableTab();
      }),
      switchMap((plan: PlanDetail) =>
        this.getThemedUrlResponse(partnerId, planId).pipe(
          tap((themedUrl: string | null) => {
            const planWithThemedUrl: PlanDetail = {
              ...plan,
              themedUrl: themedUrl || undefined,
            };
            this.selectedPlanDetail = this.getHeaderPlanDetail(planWithThemedUrl);
          }),
        ),
      ),
      catchError((error: unknown) => {
        this.editingPlan.setSelectedPlanDetail(new BaseResponse(null as any, error));
        this.isPlanDetailSettled = true;
        this.moveToAvailableTab();
        return EMPTY;
      }),
    );
  }
}
