import { ViewportScroller } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { LoadPlanDetailEvent } from '@fz-original/app/core/tracking/core/events/load-plan-detail';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { PlanReviewSuccessPanelComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/components/plan-review-success-panel/plan-review-success-panel.component';
import { PlanCreationComponent } from '@fz-original/app/modules/plan/plan-creation/containers/plan-creation/plan-creation.component';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { PlanDetail } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { PlanKind } from '@fz-original/app/shared/models/plan/plan-kind.enum';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';

import { ScreenTypeaheadInput } from '../../../core/tracking/core/events/select-option-typeahead';
import { PageTitleModule } from '../../layout/page-title/page-title.module';
import { SpinnerService } from '../../layout/spinner/spinner.service';
import { Partner } from '../../models/partner/partner.model';
import { Plan } from '../../models/plan/plan.model';
import { SearchBarFilter } from '../../search-bar/enums/search-bar-filter.enum';
import { SearchFilter } from '../../search-bar/models/search-filter.model';
import { SearchBarModule } from '../../search-bar/search-bar.module';
import { PartnerService } from '../../services/partner/partner.service';
import { PlanEditionLockService } from '../../services/plan-review/plan-edition-lock.service';
import { PlanDetailService } from '../../services/plan/plan-detail.service';
import { PlanService } from '../../services/plan/plan.service';
import { SelectedPlanContextService } from '../../services/selected-plan-context/selected-plan-context.service';
import { UserService } from '../../services/user/user.service';
import { navigateToChannelsSettings } from '../../utils/navigate-to-channels-settings.util';
import { PlanMetricsComponent } from '../plan-metrics/plan-metrics.component';

@Component({
  selector: 'app-plan-dashboard',
  templateUrl: './plan-dashboard.component.html',
  styleUrls: ['./plan-dashboard.component.scss'],
  standalone: true,
  imports: [
    PageTitleModule,
    PlanCreationComponent,
    PlanMetricsComponent,
    PlanReviewSuccessPanelComponent,
    SearchBarModule,
    SharedComponentsModule,
    TranslateModule,
  ],
})
export class PlanDashboardComponent implements OnInit {
  #channelId: string | undefined = undefined;
  #currentPlanId: number | undefined = undefined;
  #destroyRef = inject(DestroyRef);
  #hasEverBeenPublished: WritableSignal<boolean> = signal<boolean>(false);
  #initialLoadHandled: WritableSignal<boolean> = signal<boolean>(false);
  #partner: Partner | null = null;
  #partnerService = inject(PartnerService);
  #planDetailService = inject(PlanDetailService);
  readonly #planEditionLockService = inject(PlanEditionLockService);
  #planId: number | undefined = undefined;
  #planService = inject(PlanService);
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #scroller = inject(ViewportScroller);
  #selectedPlanContextService = inject(SelectedPlanContextService);
  #spinnerService = inject(SpinnerService);
  #trackingService = inject(TrackingService);
  #userService = inject(UserService);

  readonly #canViewDashboard = signal<boolean>(this.#hasDashboardViewPermission());
  protected readonly canViewDashboard = this.#canViewDashboard.asReadonly();

  get channelId(): string | undefined {
    return this.#channelId;
  }
  get isDraftPlan(): boolean {
    const hasCreateEventsPermission =
      this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS) || this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS);
    if (!hasCreateEventsPermission) {
      return false;
    }
    return this.plan?.status === PlanStatus.DRAFT;
  }

  get isReadyButNotPublished(): boolean {
    if (!this.plan || this.plan.status === PlanStatus.DRAFT) {
      return false;
    }
    if (this.#hasEverBeenPublished() === true) {
      return false;
    }
    if ('publishedAt' in this.plan) {
      return this.plan.publishedAt == null;
    }
    if ('isPublished' in this.plan) {
      return this.plan.isPublished !== true;
    }
    return false;
  }

  get showReadyPanel(): boolean {
    return !this.canViewDashboard() || this.isReadyButNotPublished;
  }

  plan: Plan | PlanDetail | null = null;
  screen = ScreenTypeaheadInput;
  readonly searchBarFilter = SearchBarFilter;
  showSearchBar = false;
  showSelectPlan = false;

  constructor() {
    this.#partner = this.#partnerService.getPartner();
    this.showSearchBar = this.#shouldShowSearchBar();
    this.#userService
      .observePermissions()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#canViewDashboard.set(this.#hasDashboardViewPermission());
      });
    this.#route.queryParams.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((queryParams: Params) => {
      if (!this.#initialLoadHandled()) {
        return;
      }
      const planIdParam: string | undefined = this.#route.snapshot.params.id ?? queryParams.planId;
      if (planIdParam === undefined) {
        if (this.plan === null) {
          this.#planEditionLockService.loadForPlan(null);
          this.showSelectPlan = true;
        }
        return;
      }
      const newPlanId: number = parseInt(planIdParam.toString());
      if (this.#currentPlanId !== newPlanId) {
        this.#loadPlan(planIdParam);
      }
    });
  }

  loadNewSearch(filters: SearchFilter): void {
    this.#planEditionLockService.loadForPlan(filters.selectedPlan?.id ?? null);
    if (filters.selectedPlan?.id) {
      const queryParams: Record<string, string | number> = {};
      if (filters.selectedCity?.id) {
        queryParams.cityId = filters.selectedCity.id;
      }
      if (filters.selectedPlan?.id) {
        queryParams.planId = filters.selectedPlan.id;
      }
      if (filters.selectedPlace?.id) {
        queryParams.venueId = filters.selectedPlace.id;
      }
      if (filters.selectedChannel?.id) {
        queryParams.channelId = filters.selectedChannel.id;
      }
      if (this.#route.snapshot.queryParams['step']) {
        queryParams.step = this.#route.snapshot.queryParams['step'];
      }

      this.#router.navigate(['/plans/dashboard'], { queryParams });
    }
  }

  onBackToEventList(): void {
    this.#router.navigate(['/plans']);
  }

  onTakeMeToChannels(): void {
    navigateToChannelsSettings(
      this.#selectedPlanContextService,
      this.#router,
      this.plan?.id,
      this.#route.snapshot.queryParams,
      this.#destroyRef,
    );
  }

  ngOnInit(): void {
    this.#scroller.scrollToPosition([0, 0]);
    if (this.#partner === null) {
      return;
    }
    const initialPlanId: string | undefined = this.#route.snapshot.params.id ?? this.#route.snapshot.queryParams.planId;
    if (initialPlanId !== undefined) {
      this.#loadPlan(initialPlanId);
    } else {
      this.#planEditionLockService.loadForPlan(null);
      this.showSelectPlan = true;
    }
    this.#initialLoadHandled.set(true);
  }

  #hasDashboardViewPermission(): boolean {
    return [Permissions.CAN_VIEW_DASHBOARD, Permissions.CAN_VIEW_AFFILIATE_DASHBOARD, Permissions.CAN_VIEW_AMBASSADOR_DASHBOARD].some(
      permission => this.#userService.hasPermission(permission),
    );
  }

  #loadPlan(planId: number | string): void {
    this.plan = null;
    this.#hasEverBeenPublished.set(false);
    this.showSelectPlan = false;
    this.#spinnerService.show();
    this.#planId = parseInt(planId.toString());
    this.#currentPlanId = this.#planId;
    this.#planEditionLockService.loadForPlan(Number.isNaN(this.#planId!) ? null : this.#planId!);
    this.#channelId = this.#route.snapshot.params.channelId || this.#route.snapshot.queryParams.channelId;
    if (this.#selectedPlanContextService.currentContext.planId !== this.#planId) {
      this.#selectedPlanContextService.updatePlanContext(this.#planId, undefined, this.#channelId);
    }
    if (!this.#partner) {
      return;
    }
    const isReseller = this.#partner.type !== undefined && this.#partnerService.isReseller(this.#partner.type);
    const planDetail$: Observable<Plan | PlanDetail | null> = isReseller
      ? this.#planService.getResellerPlan(this.#partner.id, this.#planId!, this.#channelId).pipe(
          map(response => {
            if (response?.data) {
              this.#hasEverBeenPublished.set(response.data.hasEverBeenPublished === true);
              return response.data;
            }

            return null;
          }),
        )
      : this.#planDetailService
          .getPlanDetail(this.#partner.id, this.#planId!)
          .pipe(mergeMap((planDetail: PlanDetail) => this.#enrichWithPublicationHistory(planDetail)));
    planDetail$
      .pipe(
        mergeMap((planDetail: Plan | PlanDetail | null) => {
          if (planDetail !== null) {
            this.plan = planDetail;
            this.#spinnerService.hide();
            this.#updatePlanKind(planDetail);

            if (this.plan && this.plan.id) {
              this.#trackingService.track(
                new LoadPlanDetailEvent({
                  id: this.plan.id,
                  name: this.plan.name ?? '',
                }),
              );
            }

            return of(planDetail);
          }
          return throwError(() => planDetail);
        }),
        catchError(() => {
          this.#spinnerService.hide();
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #enrichWithPublicationHistory(planDetail: PlanDetail): Observable<PlanDetail> {
    const partnerId = this.#partner?.id;
    const planId = planDetail.id;
    const needsPublicationHistory =
      planDetail.status !== PlanStatus.DRAFT && planDetail.publishedAt == null && partnerId !== undefined && planId !== undefined;

    if (!needsPublicationHistory) {
      return of(planDetail);
    }

    this.#planService.invalidatePlanDetail(planId);

    return this.#planService.getPlan(partnerId, planId).pipe(
      tap(response => {
        this.#hasEverBeenPublished.set(response.data?.hasEverBeenPublished === true);
      }),
      map(() => planDetail),
      catchError(() => {
        this.#hasEverBeenPublished.set(false);
        return of(planDetail);
      }),
    );
  }

  #updatePlanKind(plan: Plan | PlanDetail): void {
    const kind: PlanKind | null = plan instanceof Plan ? (plan.kind ?? null) : ((plan.type as PlanKind) ?? null);
    const planId = plan.id;
    if (planId !== undefined) {
      this.#selectedPlanContextService.setPlanKind(planId, kind);
    }
  }

  #shouldShowSearchBar(): boolean {
    const isReseller: boolean = this.#partner?.type !== undefined && this.#partnerService.isReseller(this.#partner.type);
    const currentUrl: string = this.#route.snapshot.url?.join('/') || '';
    const isAmbassador: boolean = currentUrl.includes('ambassador') || this.#route.snapshot.data?.['isAmbassador'];
    return !(this.#partner === null || isReseller || isAmbassador);
  }
}
