import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { DynamicFieldEntity } from '@fz-original/app/shared/dynamic-fields/enums/dynamic-field-entity.enum';
import { DynamicFieldsService } from '@fz-original/app/shared/dynamic-fields/services/dynamic-fields.service';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { IgntStepperComponent } from '@ignite/legacy/components/ignt-stepper/ignt-stepper.component';
import { Step } from '@ignite/legacy/components/ignt-stepper/ignt.stepper.model';
import { TranslateService } from '@ngx-translate/core';
import { catchError, distinctUntilChanged, forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { Permissions } from '../../../../../shared/services/user/permissions';
import { UserService } from '../../../../../shared/services/user/user.service';
import { TagsService } from '../../../../content-plan/services/tags/tags.service';
import { PlanTermsAndConditionsDraftService } from '../../services/plan-terms-and-conditions-draft.service';
import { CardItem, SetupProvider } from '../plan-setup/plan-setup.model';
import { resolveSetupProvider } from '../plan-setup/plan-setup.resolver';
import { PlanStepperNavigationService } from '../services/plan-stepper-navigation.service';
import { calculatePlanContentCompletion, planRequiresTermsAndConditions } from '../utils/plan-content-completion.util';
import { buildPlanDynamicFieldsStepperCardItems, PlanDynamicFieldsData } from '../utils/plan-dynamic-fields-completion.util';
import { createPlanStepperSteps } from '../utils/plan-stepper-steps.util';
import { buildPlanTagsStepperCardItem, PlanTagsData } from '../utils/plan-tags-completion.util';
import { CurrentStepId, mapCardStatusToStepStatus, SetupCardStatus } from '../utils/step-status-mapper.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntStepperComponent],
  selector: 'app-plan-stepper',
  standalone: true,
  styleUrls: ['./plan-stepper.component.scss'],
  templateUrl: './plan-stepper.component.html',
})
export class PlanStepperComponent {
  #navigationService = inject(PlanStepperNavigationService);
  #route = inject(ActivatedRoute);
  #termsDraft = inject(PlanTermsAndConditionsDraftService);
  #translateService = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dynamicFieldsService = inject(DynamicFieldsService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #userService = inject(UserService);
  readonly #tagsService = inject(TagsService);
  readonly #planDynamicFieldsData = signal<PlanDynamicFieldsData | null>(null);
  readonly #planTagsData = signal<PlanTagsData | null>(null);

  planId = input.required<number>();
  currentStepId = input<CurrentStepId>('content');
  hideContent = input<boolean>(false);
  includeInventory = input<boolean>(false);
  planCreationStatus = input<PlanCreationStatusData | null>(null);

  readonly #planAndId = computed(() => ({
    planId: this.planId(),
    plan: this.planCreationStatus(),
  }));

  constructor() {
    toObservable(this.#planAndId)
      .pipe(
        map(({ planId, plan }) => (plan !== null ? planId : null)),
        distinctUntilChanged(),
        switchMap(planId => this.#loadPlanTagsData(planId)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(planTagsData => this.#planTagsData.set(planTagsData));

    toObservable(this.#planAndId)
      .pipe(
        map(({ planId, plan }) => (plan !== null ? planId : null)),
        distinctUntilChanged(),
        switchMap(planId => this.#loadPlanDynamicFieldsData(planId)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(planDynamicFieldsData => this.#planDynamicFieldsData.set(planDynamicFieldsData));
  }

  #setupProvider: Signal<SetupProvider | null> = computed(() => {
    const plan = this.planCreationStatus();
    return resolveSetupProvider(plan);
  });

  #contentCardStatus: Signal<SetupCardStatus> = computed(() => {
    this.#termsDraft.snapshots();
    this.#planTagsData();
    const plan = this.planCreationStatus();
    const planTagsData = this.#planTagsData();
    const completion = calculatePlanContentCompletion(plan, this.#termsDraft, planTagsData);
    const items: CardItem[] = [
      { label: 'content', completed: completion.content },
      { label: 'media', completed: completion.media },
      { label: 'venue', completed: completion.venue },
      buildPlanTagsStepperCardItem(planTagsData),
    ];
    if (plan !== null && planRequiresTermsAndConditions(plan)) {
      items.push({ label: 'termsAndConditions', completed: completion.termsAndConditions });
    }
    return this.#calculateCardStatus(items);
  });

  #settingsCardStatus: Signal<SetupCardStatus> = computed(() => {
    const plan = this.planCreationStatus();
    const provider = this.#setupProvider();
    if (!provider || !plan) {
      return 'not-started';
    }
    const items = [...provider.getSettingsCardItems(plan), ...buildPlanDynamicFieldsStepperCardItems(this.#planDynamicFieldsData())];
    return this.#calculateCardStatus(items);
  });

  #inventoryCardStatus: Signal<SetupCardStatus> = computed(() => {
    // TODO: Replace with actual inventory completion logic when available
    return 'not-started';
  });

  contentStatus: Signal<Step['status']> = computed(() =>
    mapCardStatusToStepStatus(this.#contentCardStatus(), this.currentStepId() === 'content'),
  );

  settingsStatus: Signal<Step['status']> = computed(() =>
    mapCardStatusToStepStatus(this.#settingsCardStatus(), this.currentStepId() === 'settings'),
  );

  inventoryStatus: Signal<Step['status']> = computed(() =>
    mapCardStatusToStepStatus(this.#inventoryCardStatus(), this.currentStepId() === 'inventory'),
  );

  currentStepIndex: Signal<number> = computed(() => {
    const stepId = this.currentStepId();
    switch (stepId) {
      case 'content':
        return 0;
      case 'settings':
        return 1;
      case 'inventory':
        return 2;
      default:
        return 0;
    }
  });

  steps: Signal<Step[]> = computed(() => {
    return createPlanStepperSteps(this.#translateService, {
      includeContent: true,
      includeEventSettings: true,
      includeInventorySetup: this.includeInventory(),
      contentStatus: this.contentStatus(),
      eventSettingsStatus: this.settingsStatus(),
      inventorySetupStatus: this.inventoryStatus(),
    });
  });

  onStepClick(stepIndex: number): void {
    this.#navigationService.handleStepClick(stepIndex, this.steps(), this.planId(), this.#route, this.currentStepId());
  }

  #loadPlanTagsData(planId: number | null): Observable<PlanTagsData | null> {
    if (planId === null) return of(null);
    if (!this.#userService.hasPermission(Permissions.CAN_SET_TAGS_WHEN_CREATING_PLAN)) return of(null);
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) return of(null);
    return forkJoin({
      availableTags: this.#tagsService.getAvailableTags(partner.id),
      planTags: this.#tagsService.getPlanTags(partner.id, planId),
    }).pipe(catchError(() => of(null)));
  }

  #loadPlanDynamicFieldsData(planId: number | null): Observable<PlanDynamicFieldsData | null> {
    if (planId === null) return of(null);
    if (!(this.#optimizelyService.isFeatureEnabled(FeatureFlags.DYNAMIC_FIELDS) ?? false)) return of(null);
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) return of(null);
    return this.#dynamicFieldsService.getPlanEntityDynamicFields(partner.id, planId, DynamicFieldEntity.MainPlan).pipe(
      map(dynamicFields => ({ dynamicFields, planId })),
      catchError((error: unknown) =>
        of(error instanceof HttpErrorResponse && error.status === HttpStatusCode.Forbidden ? null : { dynamicFields: null, planId }),
      ),
    );
  }

  #calculateCardStatus(items: CardItem[]): SetupCardStatus {
    const requiredItems = items.filter(item => !item.optional);
    const completedRequiredCount = requiredItems.filter(item => item.completed).length;
    const totalRequiredCount = requiredItems.length;

    if (totalRequiredCount > 0 && completedRequiredCount === totalRequiredCount) {
      return 'completed';
    } else if (completedRequiredCount > 0) {
      return 'in-progress';
    }
    return 'not-started';
  }
}
