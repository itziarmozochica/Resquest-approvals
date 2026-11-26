import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { CapacityTemplateService } from '@fz-original/app/modules/inventory/inventory-capacity/services/capacity-template.service';
import { CapacityTemplate } from '@fz-original/app/modules/inventory/shared/models/capacity-template.model';
import { PlanContentEditComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-content-edit/plan-content-edit.component';
import { PlanCreationHeaderComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-creation-header/plan-creation-header.component';
import { PlanErrorComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-error/plan-error.component';
import { PlanSettingsEditComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/plan-settings-edit.component';
import { PlanSetupComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan-setup.component';
import { PlanCreationStatusService } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/services/plan-creation-status.service';
import { PlanStepperNavigationService } from '@fz-original/app/modules/plan/plan-creation/components/services/plan-stepper-navigation.service';
import {
  hasProvisionedInventory,
  InventoryProvisioningService,
} from '@fz-original/app/modules/plan/services/inventory-provisioning.service';
import { planCreationAbandoned } from '@fz-original/app/modules/plan/tracking/events/plan-creation-abandoned.event';
import { PlanCreationAbandonStep } from '@fz-original/app/modules/plan/tracking/models/plan-tracking.model';
import { planTrackingProvider } from '@fz-original/app/modules/plan/tracking/plan.tracking-provider';
import {
  PlanCreationAbandonmentRegistration,
  PlanCreationAbandonmentTrackerService,
} from '@fz-original/app/modules/plan/tracking/services/plan-creation-abandonment-tracker.service';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanEditionLockService } from '@fz-original/app/shared/services/plan-review/plan-edition-lock.service';
import { SessionTypeInventory } from '@fz-original/app/shared/services/sessions/session-type.model';
import { SessionTypeService } from '@fz-original/app/shared/services/sessions/session-type.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, of, Subscription } from 'rxjs';

import { PlanCreationView } from '../../plan-creation-view.enum';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IgntIconComponent,
    TranslateModule,
    PlanCreationHeaderComponent,
    PlanSetupComponent,
    PlanContentEditComponent,
    PlanSettingsEditComponent,
    PlanErrorComponent,
  ],
  providers: [...planTrackingProvider(), PlanStepperNavigationService],
  selector: 'app-plan-creation',
  standalone: true,
  styleUrls: ['./plan-creation.component.scss'],
  templateUrl: './plan-creation.component.html',
})
export class PlanCreationComponent implements OnInit {
  #capacityTemplateService = inject(CapacityTemplateService);
  readonly #abandonmentTracker = inject(PlanCreationAbandonmentTrackerService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #abandonmentRegistration: PlanCreationAbandonmentRegistration = {
    getLastStepReached: () => this.#toAbandonStep(this.currentView()),
    getPlanId: () => this.planId(),
    trackAbandoned: payload => {
      this.#fzTracking.track(planCreationAbandoned(payload));
    },
  };
  #destroyRef = inject(DestroyRef);
  readonly #inventoryProvisioningService = inject(InventoryProvisioningService);
  #partnerService = inject(PartnerService);
  #planCreationStatusService = inject(PlanCreationStatusService);
  readonly #planEditionLockService = inject(PlanEditionLockService);
  #pollSubscription?: Subscription;
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #sessionTypeService = inject(SessionTypeService);

  planId = input.required<number>();

  capacityTemplates: WritableSignal<CapacityTemplate[]> = signal([]);
  currentView = signal<PlanCreationView>(PlanCreationView.SETUP);
  error = signal<boolean>(false);
  inventoryData: WritableSignal<SessionTypeInventory | null> = signal(null);
  isInventoryProvisioning = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  PlanCreationView = PlanCreationView;
  planDetail: WritableSignal<PlanCreationStatusData | null> = signal(null);
  planEditionIsLockedForEdition = this.#planEditionLockService.isLockedForEdition;
  planEditionLockResolved = this.#planEditionLockService.lockResolved;

  constructor() {
    effect(() => {
      if (!this.#planEditionLockService.lockResolved() || !this.#planEditionLockService.isLockedForEdition()) {
        return;
      }
      const view = this.currentView();
      if (view !== PlanCreationView.CONTENT && view !== PlanCreationView.SETTINGS) {
        return;
      }
      void this.#router.navigate([], {
        queryParams: {
          planId: this.planId(),
          step: PlanCreationView.SETUP,
        },
        queryParamsHandling: 'merge',
        relativeTo: this.#route,
        replaceUrl: true,
      });
    });
  }
  headerTitle = computed(() => (this.currentView() === PlanCreationView.SETUP ? null : (this.planDetail()?.name ?? null)));
  planName = computed(() => this.planDetail()?.name ?? null);
  showDashboardBreadcrumb = computed(() => this.currentView() !== PlanCreationView.SETUP);

  navigateToInventory(): void {
    const plan = this.planDetail();
    const venueId = plan?.venues?.[0]?.id;

    this.#router.navigate(['/inventory', 'ticket-types'], {
      queryParams: {
        planId: this.planId(),
        venueId,
      },
    });
  }

  navigateToView(view: PlanCreationView): void {
    if (this.#shouldBlockPlanEditionStep(view)) {
      return;
    }
    const previousView = this.currentView();
    this.currentView.set(view);

    if (view === PlanCreationView.SETUP && previousView !== PlanCreationView.SETUP) {
      this.#reloadPlanDetailsIfNeeded();
    }

    this.#router.navigate([], {
      queryParams: {
        planId: this.planId(),
        step: view,
      },
      queryParamsHandling: 'merge',
      relativeTo: this.#route,
      replaceUrl: false,
    });
  }

  ngOnInit() {
    this.#abandonmentTracker.register(this.#abandonmentRegistration);
    this.#destroyRef.onDestroy(() => {
      this.#abandonmentTracker.unregister(this.#abandonmentRegistration);
    });

    this.#planEditionLockService.loadForPlan(this.planId());
    this.#setInitialView();
    this.#subscribeToViewChanges();
    const id = this.planId();
    if (id) {
      this.#loadPlanDetails(id);
    }
  }

  retryLoadPlan(planId: number): void {
    this.#loadPlanDetails(planId);
  }

  #getViewFromQueryParam(param: string): PlanCreationView | null {
    switch (param) {
      case 'content':
        return PlanCreationView.CONTENT;
      case 'settings':
        return PlanCreationView.SETTINGS;
      case 'setup':
        return PlanCreationView.SETUP;
      default:
        return null;
    }
  }

  #loadPlanDetails(planId: number): void {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      this.error.set(true);
      this.isLoading.set(false);
      return;
    }

    this.error.set(false);
    this.isLoading.set(true);

    forkJoin({
      capacityTemplates: this.#capacityTemplateService.getCapacityTemplates(planId).pipe(catchError(() => of([]))),
      inventory: this.#sessionTypeService.getSessionTypesInventoryByPlanId(planId).pipe(catchError(() => of(null))),
      planDetails: this.#planCreationStatusService.getPlanCreationStatus(partner.id, planId),
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.error.set(true);
          this.isLoading.set(false);
        },
        next: ({ capacityTemplates, inventory, planDetails }) => {
          this.capacityTemplates.set(capacityTemplates);
          this.inventoryData.set(inventory);
          this.planDetail.set(planDetails);
          this.isLoading.set(false);
          this.#syncInventoryProvisioning(planId, inventory);
        },
      });
  }

  #reloadPlanDetailsIfNeeded(): void {
    const id = this.planId();
    if (id) {
      this.#loadPlanDetails(id);
    }
  }

  #resolveAllowedView(view: PlanCreationView): PlanCreationView {
    if (this.#shouldBlockPlanEditionStep(view)) {
      return PlanCreationView.SETUP;
    }
    return view;
  }

  #setInitialView(): void {
    const stepParam = this.#route.snapshot.queryParams['step'];
    let initialView = PlanCreationView.SETUP;

    if (stepParam) {
      const view = this.#getViewFromQueryParam(stepParam);
      if (view) {
        initialView = this.#resolveAllowedView(view);
      }
    }

    this.currentView.set(initialView);
    this.#updateViewQueryParam(initialView, stepParam);
  }

  #shouldBlockPlanEditionStep(view: PlanCreationView): boolean {
    if (view !== PlanCreationView.CONTENT && view !== PlanCreationView.SETTINGS) {
      return false;
    }
    return this.#planEditionLockService.lockResolved() && this.#planEditionLockService.isLockedForEdition();
  }

  #subscribeToViewChanges(): void {
    this.#route.queryParams.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(queryParams => {
      const stepParam = queryParams['step'];
      const previousView = this.currentView();
      const viewFromParam = stepParam ? this.#getViewFromQueryParam(stepParam) : PlanCreationView.SETUP;
      const view = viewFromParam ? this.#resolveAllowedView(viewFromParam) : null;

      if (view && view !== previousView) {
        this.currentView.set(view);
        if (view === PlanCreationView.SETUP) {
          this.#reloadPlanDetailsIfNeeded();
        }
      }
    });
  }

  #syncInventoryProvisioning(planId: number, inventory: SessionTypeInventory | null): void {
    if (hasProvisionedInventory(inventory)) {
      this.#pollSubscription?.unsubscribe();
      this.#inventoryProvisioningService.clearProvisioning(planId);
      return;
    }
    if (this.isInventoryProvisioning()) {
      return;
    }
    if (!this.#inventoryProvisioningService.isProvisioning(planId)) {
      return;
    }
    this.isInventoryProvisioning.set(true);
    this.#pollSubscription = this.#inventoryProvisioningService
      .pollInventoryUntilReady$(planId)
      .pipe(
        finalize(() => this.isInventoryProvisioning.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(readyInventory => this.inventoryData.set(readyInventory));
  }

  #updateViewQueryParam(currentView: PlanCreationView, existingViewParam: string | undefined): void {
    if (!existingViewParam || existingViewParam !== currentView) {
      this.#router.navigate([], {
        queryParams: {
          planId: this.planId(),
          step: currentView,
        },
        queryParamsHandling: 'merge',
        relativeTo: this.#route,
        replaceUrl: true,
      });
    }
  }

  #toAbandonStep(view: PlanCreationView): PlanCreationAbandonStep | null {
    switch (view) {
      case PlanCreationView.CONTENT:
        return 'content';
      case PlanCreationView.SETTINGS:
        return 'settings';
      case PlanCreationView.SETUP:
        return 'setup';
      default:
        return null;
    }
  }
}
