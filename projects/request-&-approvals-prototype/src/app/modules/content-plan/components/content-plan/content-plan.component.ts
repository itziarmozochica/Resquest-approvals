import { Component, inject, OnDestroy, signal, viewChild } from '@angular/core';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { EventSelectionBandComponent } from '@fz-original/app/shared/components/event-selection-band/event-selection-band.component';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';
import { forkJoin, merge, of, Subject } from 'rxjs';
import { finalize, takeUntil, tap } from 'rxjs/operators';

import { LoadPlanContentEvent } from '../../../../core/tracking/core/events/load-plan-content';
import { ScreenTypeaheadInput } from '../../../../core/tracking/core/events/select-option-typeahead';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { FilterDateRange } from '../../../../shared/layout/filters/date-range/date-range.interface';
import { SelectOption } from '../../../../shared/layout/filters/select/select.interface';
import { FzAssistantHostConfig } from '../../../../shared/models/fz-assistant/fz-assistant-host.model';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { PlanDetail } from '../../../../shared/models/plan/plan-detail.model';
import { WithUnsavedChangesGuardComponent } from '../../../../shared/models/with-unsaved-changes-guard-component.model';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import { SearchBarFilter } from '../../../../shared/search-bar/enums/search-bar-filter.enum';
import { SearchFilter } from '../../../../shared/search-bar/models/search-filter.model';
import { PlanEditionLockService } from '../../../../shared/services/plan-review/plan-edition-lock.service';
import { PlanDetailService } from '../../../../shared/services/plan/plan-detail.service';
import { Permissions } from '../../../../shared/services/user/permissions';
import { UserService } from '../../../../shared/services/user/user.service';
import { EditingPlanService } from '../../services/editing-plan/editing-plan.service';
import { PlanThemedUrlService } from '../../services/plan-themed-url/plan-themed-url.service';
import { ImmersivePlanLayoutEditionComponent } from '../plan-edition/immersive-plan-layout/immersive-plan-layout-edition.component';

@Component({
  selector: 'app-content-plan',
  standalone: false,
  styleUrl: './content-plan.component.scss',
  templateUrl: './content-plan.component.html',
})
export class ContentPlanComponent implements OnDestroy, WithUnsavedChangesGuardComponent {
  readonly assistantHostConfig: FzAssistantHostConfig = {
    viewId: 'events_content',
  };
  #destroy$ = new Subject<void>();
  readonly #cancelLoad$ = new Subject<void>();
  readonly #editingPlan = inject(EditingPlanService);
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #planDetailService = inject(PlanDetailService);
  readonly #planEditionLock = inject(PlanEditionLockService);
  readonly #planThemedUrlService = inject(PlanThemedUrlService);
  readonly #trackingService = inject(TrackingService);
  readonly #userService = inject(UserService);
  protected readonly immersiveTab = viewChild(ImmersivePlanLayoutEditionComponent);

  readonly areChangesUnsavedFn = (): boolean => this.areChangesUnsaved();
  error = false;
  headerPlanDetail: Partial<PlanDetail> | null = null;
  loading = false;
  mandatoryFilters = [SearchBarFilter.city];
  partner: Partner | null = null;
  planDetail: PlanDetail | null = null;
  screen = ScreenTypeaheadInput;
  selectedPlan: SelectOption | null = null;
  selectedRange: FilterDateRange | null = null;
  showImmersiveTab = false;
  timezone = '';
  protected readonly isMobile = this.#breakpointStateService.getStateProp('isMobile');
  readonly #selectedPlanTitle = signal<string | null>(null);
  protected readonly selectedPlanTitle = this.#selectedPlanTitle.asReadonly();
  protected readonly selectionBand = viewChild(EventSelectionBandComponent);

  areChangesUnsaved(): boolean {
    return this.immersiveTab()?.areChangesUnsaved() ?? false;
  }

  loadNewSearch(filters: SearchFilter): void {
    this.#selectedPlanTitle.set(filters.selectedPlan?.title ?? null);
    if (filters.selectedPlan && this.isMobile()) {
      this.selectionBand()?.fold();
    }
    if (!filters.selectedPlan || !filters.partner) {
      this.#clearSelectedPlan();
      return;
    }
    this.partner = filters.partner;
    this.selectedPlan = filters.selectedPlan;
    this.selectedRange = filters.selectedDateRange as FilterDateRange;
    this.timezone = filters.timezone;
    this.showImmersiveTab = this.#resolveShowImmersiveTab(filters.selectedPlan);
    this.#planEditionLock.loadForPlan(filters.selectedPlan.id);
    this.#editingPlan.setSelectedPlanOption(filters.selectedPlan);
    this.loadPlanDetail();
  }

  ngOnDestroy(): void {
    this.#editingPlan.reset();
    this.#destroy$.next();
  }

  #buildHeaderPlanDetail(
    planDetail: PlanDetail,
    themedUrl: string | null,
    partner: Partner,
    selectedPlan: SelectOption,
  ): Partial<PlanDetail> {
    return {
      ...planDetail,
      id: selectedPlan.id,
      name: planDetail.name ?? selectedPlan.title,
      partnerId: partner.id,
      themedUrl: themedUrl ?? undefined,
    };
  }

  #clearSelectedPlan(): void {
    this.#cancelLoad$.next();
    this.selectedPlan = null;
    this.planDetail = null;
    this.headerPlanDetail = null;
    this.loading = false;
    this.error = false;
    this.showImmersiveTab = false;
    this.#planEditionLock.loadForPlan(null);
    this.#editingPlan.reset();
  }

  #resolveShowImmersiveTab(selectedPlan: SelectOption): boolean {
    const isImmersivePlanLayoutEditorEnabled =
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.IMMERSIVE_PLAN_LAYOUT_EDITOR, { plan_id: String(selectedPlan.id) }) === true;
    return isImmersivePlanLayoutEditorEnabled && this.#userService.hasPermission(Permissions.CAN_VIEW_CONTENT);
  }

  private loadPlanDetail(): void {
    if (!this.partner || !this.selectedPlan) {
      return;
    }
    this.#cancelLoad$.next();
    const partner = this.partner;
    const selectedPlan = this.selectedPlan;
    this.loading = true;
    this.planDetail = null;
    this.headerPlanDetail = null;
    forkJoin({
      planDetail: this.#planDetailService.getPlanDetail(partner.id, selectedPlan.id),
      themedUrl: this.showImmersiveTab ? this.#planThemedUrlService.getThemedUrl(partner.id, selectedPlan.id) : of(null),
    })
      .pipe(
        tap(({ planDetail, themedUrl }) => {
          planDetail.status = selectedPlan.status as PlanStatus;
          this.planDetail = planDetail;
          this.headerPlanDetail = this.#buildHeaderPlanDetail(planDetail, themedUrl, partner, selectedPlan);
          this.#trackingService.track(
            new LoadPlanContentEvent({
              id: planDetail.id,
              name: planDetail.name,
            }),
          );
        }),
        finalize(() => (this.loading = false)),
        takeUntil(merge(this.#cancelLoad$, this.#destroy$)),
      )
      .subscribe({
        error: () => {
          this.error = true;
        },
      });
  }
}
