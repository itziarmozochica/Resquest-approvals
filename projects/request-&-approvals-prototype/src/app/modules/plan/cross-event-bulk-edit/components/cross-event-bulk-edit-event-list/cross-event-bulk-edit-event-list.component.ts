import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlanStatusTagComponent } from '@fz-original/app/shared/components/tag/plan-status-tag.component';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';
import { CityTranslatePipe } from '@fz-original/app/shared/pipes/city-translate/city-translate.pipe';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { GetPlansQuery } from '@fz-original/app/shared/services/plan/get-plans-query';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, EMPTY, map, Observable, Subject, switchMap, tap } from 'rxjs';

import { CrossEventBulkEditPlanPageRequest, CrossEventBulkEditPlanWithId } from '../../models/cross-event-bulk-edit-plan-page.model';
import { crossEventBulkEditPlanSelectionLimit } from '../../models/store/cross-event-bulk-edit-store.model';
import { CrossEventBulkEditStore } from '../../store/cross-event-bulk-edit.store';
import { crossEventBulkEditPrimaryPlace } from '../../utils/cross-event-bulk-edit-primary-place.util';
import { filterPlansByKindViewPermission } from '../../utils/plan-kind-view.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CityTranslatePipe,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntIconComponent,
    PlanStatusTagComponent,
    TranslateModule,
  ],
  selector: 'app-cross-event-bulk-edit-event-list',
  styleUrl: './cross-event-bulk-edit-event-list.component.scss',
  templateUrl: './cross-event-bulk-edit-event-list.component.html',
})
export class CrossEventBulkEditEventListComponent {
  static readonly sentinelRootMargin = '200px';

  protected readonly loadMoreSentinel = viewChild<ElementRef<HTMLElement>>('loadMoreSentinel');
  readonly #pageRequests$ = new Subject<CrossEventBulkEditPlanPageRequest>();
  readonly #pageSize = 25;
  readonly #partnerService = inject(PartnerService);
  readonly #planService = inject(PlanService);
  readonly #store = inject(CrossEventBulkEditStore);
  readonly #userService = inject(UserService);

  protected readonly isLoading = signal(true);
  protected readonly isLoadingMore = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly nextPageQuery = signal<string | null>(null);
  protected readonly plans = signal<CrossEventBulkEditPlanWithId[]>([]);
  protected readonly selectionLimit = crossEventBulkEditPlanSelectionLimit;
  protected readonly isSelectionFull = this.#store.isSelectionFull;

  protected readonly isSelectAllChecked = computed(() => {
    const plans = this.plans();
    if (plans.length === 0) {
      return false;
    }

    const selectedPlanIds = new Set(this.#store.selectedPlanIds());
    const selectedLoadedCount = plans.filter(plan => selectedPlanIds.has(plan.id)).length;
    if (selectedLoadedCount === 0) {
      return false;
    }

    return selectedLoadedCount === plans.length || this.isSelectionFull();
  });

  #searchTerm = '';

  constructor() {
    this.#pageRequests$
      .pipe(
        switchMap(request => this.#fetchPlans(request)),
        takeUntilDestroyed(),
      )
      .subscribe();

    this.#requestFirstPage();

    // Re-arm after every page: an observer only reports changes, so a sentinel still in view after an append would never fire again.
    // After a failed page, skip the initial report so a sentinel still in view does not retry in a loop.
    // Load more covers that case, including when the 200px root margin keeps a short list inside the expanded root.
    afterRenderEffect(onCleanup => {
      const sentinelElement = this.loadMoreSentinel()?.nativeElement;
      if (sentinelElement === undefined || this.isLoadingMore() || typeof IntersectionObserver === 'undefined') {
        return;
      }

      let skipInitialReport = this.loadFailed();
      const observer = new IntersectionObserver(
        entries => {
          if (skipInitialReport) {
            skipInitialReport = false;
            return;
          }
          if (!entries.some(entry => entry.isIntersecting)) {
            return;
          }
          this.#loadNextPage();
        },
        { root: null, rootMargin: CrossEventBulkEditEventListComponent.sentinelRootMargin },
      );
      observer.observe(sentinelElement);
      onCleanup(() => observer.disconnect());
    });
  }

  protected isPlanSelected(planId: number): boolean {
    return this.#store.selectedPlanIds().includes(planId);
  }

  protected isSelectionDisabled(planId: number): boolean {
    return this.isSelectionFull() && !this.isPlanSelected(planId);
  }

  protected onLoadMore(): void {
    this.#loadNextPage();
  }

  protected onToggleAll(): void {
    const planIds = this.plans().map(plan => plan.id);
    if (this.isSelectAllChecked()) {
      this.#store.deselectPlans(planIds);
      return;
    }

    this.#store.selectPlans(planIds);
  }

  protected onTogglePlan(planId: number): void {
    this.#store.togglePlan(planId);
  }

  protected venueName(plan: CrossEventBulkEditPlanWithId): string {
    return crossEventBulkEditPrimaryPlace(plan)?.name ?? '';
  }

  #failLoad(mode: CrossEventBulkEditPlanPageRequest['mode']): void {
    this.isLoading.set(false);
    this.isLoadingMore.set(false);
    this.loadFailed.set(true);
    if (mode === 'replace') {
      this.nextPageQuery.set(null);
      this.plans.set([]);
    }
  }

  #fetchPlans(request: CrossEventBulkEditPlanPageRequest): Observable<void> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      this.#failLoad(request.mode);
      return EMPTY;
    }

    if (request.mode === 'replace') {
      this.isLoading.set(true);
    } else {
      this.isLoadingMore.set(true);
    }
    this.loadFailed.set(false);

    return this.#planService.getPlansWithAnalytics(this.#plansQuery(partnerId, request.searchTerm), request.pageQuery).pipe(
      tap(result => {
        const data = result.data;
        if (result.error !== null || data === null) {
          this.#failLoad(request.mode);
          return;
        }

        const loadedPlans = filterPlansByKindViewPermission(
          data.filter((plan): plan is CrossEventBulkEditPlanWithId => plan.id !== undefined),
          permission => this.#userService.hasPermission(permission),
        );
        this.#store.rememberPlans(
          loadedPlans.map(plan => ({
            id: plan.id,
            isOnSale: plan.status === PlanStatus.ON_SALE,
            isPublished: plan.isPublished === true,
            name: plan.name ?? '',
            placeId: crossEventBulkEditPrimaryPlace(plan)?.id ?? null,
          })),
        );
        if (request.mode === 'replace') {
          this.plans.set(loadedPlans);
        } else {
          this.plans.update(current => [...current, ...loadedPlans]);
        }
        const nextPageQuery = result.getNextPaginationQueryString();
        this.nextPageQuery.set(nextPageQuery === null || nextPageQuery === '' ? null : nextPageQuery);
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      }),
      map((): void => undefined),
      catchError(() => {
        this.#failLoad(request.mode);
        return EMPTY;
      }),
    );
  }

  #loadNextPage(): void {
    const pageQuery = this.nextPageQuery();
    if (pageQuery === null || this.isLoadingMore()) {
      return;
    }

    this.#pageRequests$.next({ mode: 'append', pageQuery, searchTerm: this.#searchTerm });
  }

  #plansQuery(partnerId: number, searchTerm: string): GetPlansQuery {
    const trimmedSearchTerm = searchTerm.trim();
    if (trimmedSearchTerm === '') {
      return { partnerId };
    }

    if (/^\d+$/.test(trimmedSearchTerm)) {
      return { partnerId, planId: Number(trimmedSearchTerm) };
    }

    return { name: trimmedSearchTerm, partnerId };
  }

  #requestFirstPage(): void {
    this.plans.set([]);
    this.nextPageQuery.set(null);
    this.#pageRequests$.next({
      mode: 'replace',
      pageQuery: `items_per_page=${this.#pageSize}&page=1`,
      searchTerm: this.#searchTerm,
    });
  }
}
