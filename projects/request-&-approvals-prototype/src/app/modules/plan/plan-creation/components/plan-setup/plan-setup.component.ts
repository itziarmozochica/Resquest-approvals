import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { MainPlanSettingsService } from '@fz-original/app/modules/event-settings/services/main-plan-settings.service';
import { CapacityTemplate } from '@fz-original/app/modules/inventory/shared/models/capacity-template.model';
import {
  CardItem,
  InventoryCompletion,
  SetupCard,
  SetupProvider,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan-setup.model';
import { resolveSetupProvider } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan-setup.resolver';
import { PlanTermsAndConditionsDraftService } from '@fz-original/app/modules/plan/plan-creation/services/plan-terms-and-conditions-draft.service';
import { clickBackToEventList } from '@fz-original/app/modules/plan/tracking/events/click-back-to-event-list.event';
import { clickPlanSetupCard } from '@fz-original/app/modules/plan/tracking/events/click-plan-setup-card.event';
import { clickTakeMeToChannels } from '@fz-original/app/modules/plan/tracking/events/click-take-me-to-channels.event';
import { enterInventoryFromPlanCreation } from '@fz-original/app/modules/plan/tracking/events/enter-inventory-from-plan-creation.event';
import { loadPlanCreation } from '@fz-original/app/modules/plan/tracking/events/load-plan-creation.event';
import { PlanReviewBackVariant, PlanSetupCardKey } from '@fz-original/app/modules/plan/tracking/models/plan-tracking.model';
import { PlanCreationAbandonmentTrackerService } from '@fz-original/app/modules/plan/tracking/services/plan-creation-abandonment-tracker.service';
import { PlanHeaderSummaryComponent } from '@fz-original/app/shared/components/plan-header-summary/plan-header-summary.component';
import { DynamicFieldEntity } from '@fz-original/app/shared/dynamic-fields/enums/dynamic-field-entity.enum';
import { DynamicFields } from '@fz-original/app/shared/dynamic-fields/models/dynamic-fields.model';
import { DynamicFieldsService } from '@fz-original/app/shared/dynamic-fields/services/dynamic-fields.service';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { SentryLoggerService } from '@fz-original/app/shared/services/error-logger/sentry-logger.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, distinctUntilChanged, EMPTY, finalize, forkJoin, map, Observable, of, startWith, switchMap, tap } from 'rxjs';

import { PlanCreationStatusData } from '../../../../../shared/models/plan/plan-creation-status.model';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { SelectedPlanContextService } from '../../../../../shared/services/selected-plan-context/selected-plan-context.service';
import { SessionTypeInventory } from '../../../../../shared/services/sessions/session-type.model';
import { Permissions } from '../../../../../shared/services/user/permissions';
import { UserService } from '../../../../../shared/services/user/user.service';
import { navigateToChannelsSettings } from '../../../../../shared/utils/navigate-to-channels-settings.util';
import { PlanTranslationCompletionService } from '../../../../content-plan/services/plan-translations/plan-translation-completion.service';
import { TagsService } from '../../../../content-plan/services/tags/tags.service';
import { SetupCardComponent } from '../setup-card/setup-card.component';
import { calculatePlanContentCompletion, planRequiresTermsAndConditions } from '../utils/plan-content-completion.util';
import {
  areRequiredTicketTypeDynamicFieldsFilled,
  buildPlanDynamicFieldsSetupCardItems,
  PlanDynamicFieldsData,
} from '../utils/plan-dynamic-fields-completion.util';
import { buildPlanTagsSetupCardItem, PlanTagsData } from '../utils/plan-tags-completion.util';
import { buildPlanTranslationSetupCardItem } from '../utils/plan-translation-completion.util';
import { PlanReviewHistoryComponent } from './components/plan-review-history/plan-review-history.component';
import { PlanReviewRejectedBannerComponent } from './components/plan-review-rejected-banner/plan-review-rejected-banner.component';
import { PlanReviewReviewerActionsComponent } from './components/plan-review-reviewer-actions/plan-review-reviewer-actions.component';
import { PlanReviewSubmitPanelComponent } from './components/plan-review-submit-panel/plan-review-submit-panel.component';
import { PlanReviewSuccessPanelComponent } from './components/plan-review-success-panel/plan-review-success-panel.component';
import { PlanReviewFacade } from './services/plan-review.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IgntIconComponent,
    PlanHeaderSummaryComponent,
    PlanReviewHistoryComponent,
    PlanReviewRejectedBannerComponent,
    PlanReviewReviewerActionsComponent,
    PlanReviewSubmitPanelComponent,
    PlanReviewSuccessPanelComponent,
    SetupCardComponent,
    TranslateModule,
  ],
  providers: [PlanReviewFacade],
  selector: 'app-plan-setup',
  standalone: true,
  styleUrls: ['./plan-setup.component.scss'],
  templateUrl: './plan-setup.component.html',
})
export class PlanSetupComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dynamicFieldsService = inject(DynamicFieldsService);
  readonly #mainPlanSettingsService = inject(MainPlanSettingsService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #selectedPlanContextService = inject(SelectedPlanContextService);
  readonly #sentryLoggerService = inject(SentryLoggerService);
  readonly #tagsService = inject(TagsService);
  readonly #planTranslationCompletion = inject(PlanTranslationCompletionService);
  readonly #userService = inject(UserService);
  readonly #termsDraft = inject(PlanTermsAndConditionsDraftService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #abandonmentTracker = inject(PlanCreationAbandonmentTrackerService);
  readonly #reviewFacade = inject(PlanReviewFacade);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #translateService = inject(TranslateService);
  readonly #planDynamicFieldsData = signal<PlanDynamicFieldsData | null>(null);
  readonly #ticketTypeDynamicFieldsData = signal<PlanDynamicFieldsData | null>(null);
  readonly #planTagsData = signal<PlanTagsData | null>(null);
  readonly #planTranslationComplete = signal<boolean>(false);
  readonly #dynamicFieldsSettledForPlanId = signal<number | null>(null);
  readonly #tagsSettledForPlanId = signal<number | null>(null);
  readonly #termsSettledForPlanId = signal<number | null>(null);

  protected readonly canWithdrawSubmission = this.#reviewFacade.canWithdrawSubmission;
  protected readonly currentUserId = this.#reviewFacade.currentUserId;
  protected readonly hasReviewerPermissions = this.#reviewFacade.hasReviewerPermissions;
  protected readonly justSetAsReady = this.#reviewFacade.justSetAsReady;
  protected readonly previousRejectedReviews = this.#reviewFacade.previousRejectedReviews;
  protected readonly reviewHistory = this.#reviewFacade.reviewHistory;
  protected readonly reviewLoading = this.#reviewFacade.reviewLoading;
  protected readonly reviewStatus = this.#reviewFacade.reviewStatus;
  protected readonly reviewStatusLoaded = this.#reviewFacade.reviewStatusLoaded;
  protected readonly reviewStatusLoading = this.#reviewFacade.reviewStatusLoading;
  protected readonly reviewSubmitVariant = this.#reviewFacade.reviewSubmitVariant;
  protected readonly showReadySuccess = this.#reviewFacade.showReadySuccess;
  protected readonly showReviewSubmitPanel = this.#reviewFacade.showReviewSubmitPanel;
  protected readonly showSubmittedSuccess = this.#reviewFacade.showSubmittedSuccess;

  canManageSelectedPlan = toSignal(this.#selectedPlanContextService.observeCanManageSelectedPlan(), { initialValue: true });
  capacityTemplates = input<CapacityTemplate[]>([]);
  inventoryData = input<SessionTypeInventory | null>(null);
  isInventoryProvisioning = input<boolean>(false);
  planDetail = input<PlanCreationStatusData | null>(null);
  planId = computed<number | null>(() => this.planDetail()?.id ?? null);

  headerVenue = computed<string | null>(() => {
    const venues = this.planDetail()?.venues;
    if (!venues?.length) {
      return null;
    }
    if (venues.length > 1) {
      return this.#translateService.instant('listPlan.multipleVenues');
    }
    return venues[0]?.name ?? null;
  });

  allCardsCompleted = computed(() => {
    const contentOk = this.contentCard().status === 'completed';
    const settingsOk = this.settingsCard().status === 'completed';
    const inventory = this.inventoryCard();
    const inventoryOk = !this.shouldShowInventory() || inventory?.status === 'completed';
    return this.isSetupProgressReady() && contentOk && settingsOk && inventoryOk;
  });

  constructor() {
    toObservable(this.planDetail)
      .pipe(
        map(plan => (plan !== null && planRequiresTermsAndConditions(plan) ? plan.id : null)),
        distinctUntilChanged(),
        switchMap(planId => {
          if (planId === null) return EMPTY;
          const partner = this.#partnerService.getPartner();
          if (!partner?.id) {
            this.#termsSettledForPlanId.set(planId);
            return EMPTY;
          }
          return this.#mainPlanSettingsService.getMainPlanGeneralSettings(partner.id, planId).pipe(
            tap(settings => {
              if (!this.#termsDraft.hasMeaningfulContent(planId)) {
                this.#termsDraft.setHtml(planId, settings.requiredPurchaseTerms ?? '');
              }
            }),
            catchError(() => {
              this.#sentryLoggerService.logWarning('Error loading plan settings for terms and conditions');
              return EMPTY;
            }),
            finalize(() => this.#termsSettledForPlanId.set(planId)),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();

    toObservable(this.planId)
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.#destroyRef))
      .subscribe(planId => this.#reviewFacade.loadForPlan(planId));

    toObservable(this.planDetail)
      .pipe(
        map(plan => plan?.id ?? null),
        distinctUntilChanged(),
        tap(planId => {
          if (planId === null) {
            this.#planTagsData.set(null);
          }
        }),
        switchMap(planId =>
          this.#loadPlanTagsData(planId).pipe(
            tap(planTagsData => {
              this.#planTagsData.set(planTagsData);
              if (planId !== null) {
                this.#tagsSettledForPlanId.set(planId);
              }
            }),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();

    toObservable(this.planId)
      .pipe(
        distinctUntilChanged(),
        tap(() => {
          this.#planDynamicFieldsData.set(null);
          this.#ticketTypeDynamicFieldsData.set(null);
        }),
        switchMap(planId =>
          forkJoin([this.#loadPlanDynamicFieldsData(planId), this.#loadTicketTypeDynamicFieldsData(planId)]).pipe(
            tap(([planDynamicFieldsData, ticketTypeDynamicFieldsData]) => {
              this.#planDynamicFieldsData.set(planDynamicFieldsData);
              this.#ticketTypeDynamicFieldsData.set(ticketTypeDynamicFieldsData);
              if (planId !== null) {
                this.#dynamicFieldsSettledForPlanId.set(planId);
              }
            }),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();

    effect(() => {
      const planId = this.planId();
      if (planId === null || !this.isSetupProgressReady()) {
        return;
      }

      untracked(() => this.#trackLoadPlanCreation());
    });

    toObservable(this.planId)
      .pipe(
        distinctUntilChanged(),
        switchMap(planId => this.#loadPlanTranslationCompletion(planId).pipe(startWith(false))),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(complete => this.#planTranslationComplete.set(complete));
  }

  protected readonly isSetupProgressReady = computed(() => {
    const plan = this.planDetail();
    if (!plan?.id) {
      return false;
    }

    if (this.#tagsSettledForPlanId() !== plan.id || this.#dynamicFieldsSettledForPlanId() !== plan.id) {
      return false;
    }

    if (planRequiresTermsAndConditions(plan) && this.#termsSettledForPlanId() !== plan.id) {
      return false;
    }

    return true;
  });

  contentCard = computed<SetupCard>(() => {
    this.#termsDraft.snapshots();
    this.#planTagsData();
    const id = this.planId();
    if (!id) {
      return this.#getDefaultContentCard();
    }

    const plan = this.planDetail();
    const planTagsData = this.#planTagsData();
    const contentCompletion = calculatePlanContentCompletion(plan, this.#termsDraft, planTagsData);

    const items: CardItem[] = [
      { label: 'planSetup.content.items.content', completed: contentCompletion.content },
      { label: 'planSetup.content.items.media', completed: contentCompletion.media },
      { label: 'planSetup.content.items.venue', completed: contentCompletion.venue },
      buildPlanTagsSetupCardItem(planTagsData),
    ];

    if (plan !== null && planRequiresTermsAndConditions(plan)) {
      items.push({
        label: 'planSetup.content.items.termsAndConditions',
        completed: contentCompletion.termsAndConditions,
      });
    }

    items.push(buildPlanTranslationSetupCardItem(this.#planTranslationComplete()));

    const { progress, status } = this.#calculateCardMetrics(items);

    return {
      title: 'planSetup.content.title',
      status,
      progress,
      items,
    };
  });
  inventoryCard = computed<SetupCard | null>(() => {
    if (!this.shouldShowInventory()) {
      return null;
    }
    const id = this.planId();
    if (!id) {
      return this.#getDefaultInventoryCard();
    }

    const plan = this.planDetail();
    const provider = this.setupProvider();
    const inventory = this.inventoryData();
    const templates = this.capacityTemplates();
    const items: CardItem[] =
      provider?.getInventoryCardItems?.({ capacityTemplates: templates, inventory, plan }) ??
      (() => {
        const completion = this.#calculateInventoryCompletion(
          plan,
          inventory,
          templates,
          this.#ticketTypeDynamicFieldsData(),
          this.#dynamicFieldsSettledForPlanId() === id,
        );
        return [
          { label: 'planSetup.inventory.items.products', completed: completion.products },
          { label: 'planSetup.inventory.items.capacity', completed: completion.capacity },
          { label: 'planSetup.inventory.items.inventory', completed: completion.inventory },
          { label: 'planSetup.inventory.items.pricing', completed: completion.pricing },
        ];
      })();

    const { progress, status } = this.#calculateCardMetrics(items);

    return {
      title: 'planSetup.inventory.title',
      status,
      progress,
      items,
    };
  });

  @Output() navigateToContent = new EventEmitter<void>();
  @Output() navigateToInventory = new EventEmitter<void>();
  @Output() navigateToSettings = new EventEmitter<void>();

  setupProvider = computed<SetupProvider | null>(() => {
    const plan = this.planDetail();
    return resolveSetupProvider(plan);
  });

  settingsCard = computed<SetupCard>(() => {
    const id = this.planId();
    if (!id) {
      return this.#getDefaultSettingsCard();
    }

    const plan = this.planDetail();
    const provider = this.setupProvider();
    if (provider === null) {
      return this.#getDefaultSettingsCard();
    }

    const items = [...provider.getSettingsCardItems(plan), ...buildPlanDynamicFieldsSetupCardItems(this.#planDynamicFieldsData())];

    const { progress, status } = this.#calculateCardMetrics(items);

    return {
      title: 'planSetup.settings.title',
      status,
      progress,
      items,
    };
  });

  shouldShowInventory = computed(() => {
    return this.setupProvider()?.shouldShowInventory ?? true;
  });

  onContentEdit(): void {
    this.#trackSetupCardClick('content');
    this.navigateToContent.emit();
  }

  onInventoryEdit(): void {
    this.#trackSetupCardClick('inventory');
    const planId = this.planId();
    const eventType = this.planDetail()?.type ?? '';
    if (planId !== null) {
      this.#fzTracking.track(enterInventoryFromPlanCreation({ event_type: eventType, plan_id: planId }));
    }
    this.navigateToInventory.emit();
  }

  onSettingsEdit(): void {
    this.#trackSetupCardClick('settings');
    this.navigateToSettings.emit();
  }

  onBackToEventList(variant: PlanReviewBackVariant): void {
    const planId = this.planId();
    if (planId !== null) {
      this.#fzTracking.track(clickBackToEventList({ plan_id: planId, variant }));
    }
    this.#abandonmentTracker.skipNextNavigation();
    this.#router.navigate(['/plans']);
  }

  onTakeMeToChannels(): void {
    const planId = this.planId();
    if (planId !== null) {
      this.#fzTracking.track(clickTakeMeToChannels({ plan_id: planId }));
    }
    this.#abandonmentTracker.skipNextNavigation();
    navigateToChannelsSettings(this.#selectedPlanContextService, this.#router, planId, this.#route.snapshot.queryParams, this.#destroyRef);
  }

  onSubmitReview(): void {
    this.#reviewFacade.submitReview();
  }

  onWithdrawReview(): void {
    this.#reviewFacade.withdrawReview();
  }

  onSetPlanAsReady(): void {
    const planName = this.planDetail()?.name ?? '';
    this.#reviewFacade.setPlanAsReady(planName, this.planDetail()?.launchCode ?? null);
  }

  onClaimReview(): void {
    this.#reviewFacade.claimReview();
  }

  onApproveReview(): void {
    const planName = this.planDetail()?.name ?? '';
    this.#reviewFacade.approveReview(planName);
  }

  onRejectReview(): void {
    const planName = this.planDetail()?.name ?? '';
    this.#reviewFacade.rejectReview(planName);
  }

  onReleaseReview(): void {
    this.#reviewFacade.releaseReview();
  }

  #trackLoadPlanCreation(): void {
    const plan = this.planDetail();
    if (!plan?.id) {
      return;
    }

    this.#fzTracking.track(
      loadPlanCreation({
        content_progress: this.contentCard().progress,
        event_type: plan.type,
        inventory_progress: this.inventoryCard()?.progress ?? null,
        plan_id: plan.id,
        settings_progress: this.settingsCard().progress,
        step: 'setup',
      }),
    );
  }

  #trackSetupCardClick(card: PlanSetupCardKey): void {
    const planId = this.planId();
    if (planId === null) {
      return;
    }
    this.#fzTracking.track(clickPlanSetupCard({ card, plan_id: planId }));
  }

  #loadPlanTagsData(planId: number | null): Observable<PlanTagsData | null> {
    if (planId === null) return of(null);
    if (!this.#userService.hasPermission(Permissions.CAN_SET_TAGS_WHEN_CREATING_PLAN)) return of(null);
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) return of(null);
    return forkJoin({
      availableTags: this.#tagsService.getAvailableTags(partner.id),
      planTags: this.#tagsService.getPlanTags(partner.id, planId),
    }).pipe(
      catchError(() => {
        this.#sentryLoggerService.logWarning('Error loading plan tags for creation status');
        return of(null);
      }),
    );
  }

  #loadPlanDynamicFieldsData(planId: number | null): Observable<PlanDynamicFieldsData | null> {
    return this.#loadDynamicFieldsData(
      planId,
      (partnerId, id) => this.#dynamicFieldsService.getPlanEntityDynamicFields(partnerId, id, DynamicFieldEntity.MainPlan),
      'Error loading plan dynamic fields for creation status',
    );
  }

  #loadTicketTypeDynamicFieldsData(planId: number | null): Observable<PlanDynamicFieldsData | null> {
    return this.#loadDynamicFieldsData(
      planId,
      (partnerId, id) => this.#dynamicFieldsService.getPlanSessionTypesDynamicFields(partnerId, id),
      'Error loading ticket type dynamic fields for creation status',
    );
  }

  #loadDynamicFieldsData(
    planId: number | null,
    read: (partnerId: number, planId: number) => Observable<DynamicFields>,
    loadErrorMessage: string,
  ): Observable<PlanDynamicFieldsData | null> {
    if (planId === null) return of(null);
    if (!(this.#optimizelyService.isFeatureEnabled(FeatureFlags.DYNAMIC_FIELDS) ?? false)) return of(null);
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) return of(null);
    return read(partner.id, planId).pipe(
      map(dynamicFields => ({ dynamicFields, planId })),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Forbidden) {
          return of(null);
        }
        this.#sentryLoggerService.logWarning(loadErrorMessage);
        return of({ dynamicFields: null, planId });
      }),
    );
  }

  #loadPlanTranslationCompletion(planId: number | null): Observable<boolean> {
    if (planId === null) return of(false);
    if (!this.#userService.hasPermission('can_manage_main_plan_translations')) return of(false);
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) return of(false);
    return this.#planTranslationCompletion.isPlanTranslationComplete$(partner.id, planId).pipe(
      catchError(() => {
        this.#sentryLoggerService.logWarning('Error loading plan translations for creation status');
        return of(false);
      }),
    );
  }

  #calculateCardMetrics(items: CardItem[]): { progress: number; status: 'completed' | 'in-progress' | 'not-started' } {
    const requiredItems = items.filter(item => !item.optional);
    const completedRequiredCount = requiredItems.filter(item => item.completed).length;
    const totalRequiredCount = requiredItems.length;
    const progress = totalRequiredCount > 0 ? Math.round((completedRequiredCount / totalRequiredCount) * 100) : 0;

    let status: 'completed' | 'in-progress' | 'not-started';
    if (totalRequiredCount > 0 && completedRequiredCount === totalRequiredCount) {
      status = 'completed';
    } else if (completedRequiredCount > 0) {
      status = 'in-progress';
    } else {
      status = 'not-started';
    }

    return { progress, status };
  }

  #calculateInventoryCompletion(
    plan: PlanCreationStatusData | null,
    inventory: SessionTypeInventory | null,
    capacityTemplates: CapacityTemplate[],
    ticketTypeDynamicFieldsData: PlanDynamicFieldsData | null,
    ticketTypeDynamicFieldsSettled: boolean,
  ): InventoryCompletion {
    if (!inventory || inventory.sessionTypes.length === 0) {
      return { capacity: false, inventory: false, pricing: false, products: false };
    }

    const sessionTypes = inventory.sessionTypes;
    return {
      capacity: this.#hasValidCapacityTemplates(capacityTemplates),
      inventory: plan?.hasDeclarativeInventory === true || sessionTypes.some(session => session.hasSessions === true),
      pricing: sessionTypes.every(session => session.basePrice !== undefined && session.basePrice !== null),
      // A null read means "nothing to check" only once it has settled; while loading it is unknown.
      products:
        ticketTypeDynamicFieldsSettled &&
        areRequiredTicketTypeDynamicFieldsFilled(
          ticketTypeDynamicFieldsData,
          sessionTypes.map(sessionType => sessionType.id),
        ),
    };
  }

  #getDefaultContentCard(): SetupCard {
    return {
      title: 'planSetup.content.title',
      status: 'not-started',
      progress: 0,
      items: [],
    };
  }

  #getDefaultInventoryCard(): SetupCard {
    return {
      title: 'planSetup.inventory.title',
      status: 'not-started',
      progress: 0,
      items: [],
    };
  }

  #getDefaultSettingsCard(): SetupCard {
    return {
      title: 'planSetup.settings.title',
      status: 'not-started',
      progress: 0,
      items: [],
    };
  }

  #hasValidCapacityTemplates(templates: CapacityTemplate[]): boolean {
    if (!templates || templates.length === 0) {
      return false;
    }

    return templates.some(template => {
      if (template.timeslotCapacity !== null && template.timeslotCapacity > 0) {
        return true;
      }

      return template.groups.some(group => {
        if (group.capacity !== null && group.capacity > 0) {
          return true;
        }

        return group.sessionTypes.some(
          session => (session.capacity !== null && session.capacity > 0) || session.unlimitedAvailableTickets === true,
        );
      });
    });
  }
}
