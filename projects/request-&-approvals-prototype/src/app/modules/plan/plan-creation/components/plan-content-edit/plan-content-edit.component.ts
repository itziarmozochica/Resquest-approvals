import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlanContentEditionComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-content-edition/plan-content-edition.component';
import { PlanGalleryEditionComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-gallery-edition/plan-gallery-edition.component';
import { PlanTagsEditionComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-tags-edition/plan-tags-edition.component';
import { PlanTranslationsEditionComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/plan-translations-edition.component';
import { PlanVenueEditionComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-venue-edition/plan-venue-edition.component';
import { ContentPlanModule } from '@fz-original/app/modules/content-plan/content-plan.module';
import { EditingPlanService } from '@fz-original/app/modules/content-plan/services/editing-plan/editing-plan.service';
import { MainPlanSettingsService } from '@fz-original/app/modules/event-settings/services/main-plan-settings.service';
import { PlanErrorComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-error/plan-error.component';
import { clickPlanCreationBack } from '@fz-original/app/modules/plan/tracking/events/click-plan-creation-back.event';
import { clickPlanCreationContentTab } from '@fz-original/app/modules/plan/tracking/events/click-plan-creation-content-tab.event';
import { clickPlanCreationContinue } from '@fz-original/app/modules/plan/tracking/events/click-plan-creation-continue.event';
import { clickPlanCreationSaveDraft } from '@fz-original/app/modules/plan/tracking/events/click-plan-creation-save-draft.event';
import { completePlanCreationContentStep } from '@fz-original/app/modules/plan/tracking/events/complete-plan-creation-content-step.event';
import { ActionsBarComponent } from '@fz-original/app/shared/components/actions-bar/actions-bar.component';
import { confirmDiscardUnsavedChanges } from '@fz-original/app/shared/guard/has-unsaved-changes/unsaved-changes-confirm.util';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { MobileOS } from '@fz-original/app/shared/models/device/device.model';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { PlanDetail } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { OptimizelyModule } from '@fz-original/app/shared/optimizely/optimizely.module';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { DeviceService } from '@fz-original/app/shared/services/device/device.service';
import { SentryLoggerService } from '@fz-original/app/shared/services/error-logger/sentry-logger.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanDetailService } from '@fz-original/app/shared/services/plan/plan-detail.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, finalize, map, Observable, of, switchMap, tap } from 'rxjs';

import { PlanTermsAndConditionsDraftService } from '../../services/plan-terms-and-conditions-draft.service';
import { SetupProvider } from '../plan-setup/plan-setup.model';
import { resolveSetupProvider } from '../plan-setup/plan-setup.resolver';
import { PlanCreationStatusService } from '../plan-setup/services/plan-creation-status.service';
import { PlanStepperComponent } from '../plan-stepper/plan-stepper.component';
import { PlanTermsAndConditionsEditionComponent } from '../plan-terms-and-conditions-edition/plan-terms-and-conditions-edition.component';
import { planRequiresTermsAndConditions } from '../utils/plan-content-completion.util';

enum PlanEditionTabEnum {
  Content = 'Content',
  Gallery = 'Gallery',
  Tags = 'Tags',
  TermsAndConditions = 'TermsAndConditions',
  Translations = 'Translations',
  Venue = 'Venue',
}

interface PlanEditionTab {
  id: PlanEditionTabEnum;
  label: string;
  optimizely?: string;
  permission?: string;
}

const PLAN_EDITION_TABS: PlanEditionTab[] = [
  {
    id: PlanEditionTabEnum.Content,
    label: 'planEdition.contentTab',
  },
  {
    id: PlanEditionTabEnum.Gallery,
    label: 'planEdition.galleryTab',
  },
  {
    id: PlanEditionTabEnum.Venue,
    label: 'planEdition.venue.tabTitle',
    optimizely: 'plan_edition_venue',
    permission: Permissions.CAN_MANAGE_VENUES,
  },
  {
    id: PlanEditionTabEnum.Tags,
    label: 'planEdition.tagsTab',
    permission: Permissions.CAN_SET_TAGS_WHEN_CREATING_PLAN,
  },
  {
    id: PlanEditionTabEnum.TermsAndConditions,
    label: 'planEdition.termsAndConditionsTab',
  },
  {
    id: PlanEditionTabEnum.Translations,
    label: 'planEdition.translationsTab',
    optimizely: 'enable_main_plan_translations',
    permission: 'can_manage_main_plan_translations',
  },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ActionsBarComponent,
    CommonModule,
    ContentPlanModule,
    IgntIconComponent,
    OptimizelyModule,
    PlanContentEditionComponent,
    PlanErrorComponent,
    PlanStepperComponent,
    PlanTagsEditionComponent,
    PlanTermsAndConditionsEditionComponent,
    PlanTranslationsEditionComponent,
    PlanVenueEditionComponent,
    TranslateModule,
  ],
  selector: 'app-plan-content-edit',
  standalone: true,
  styleUrls: ['./plan-content-edit.component.scss'],
  templateUrl: './plan-content-edit.component.html',
})
export class PlanContentEditComponent implements OnInit, OnDestroy {
  #contentEditionComponent: PlanContentEditionComponent | null = null;
  #destroyRef = inject(DestroyRef);
  #deviceService = inject(DeviceService);
  #editingPlanService = inject(EditingPlanService);
  #injector = inject(Injector);
  #galleryEditionComponent: PlanGalleryEditionComponent | null = null;
  #tagsEditionComponent: PlanTagsEditionComponent | null = null;
  #translationsEditionComponent: PlanTranslationsEditionComponent | null = null;
  #optimizelyService = inject(OptimizelyService);
  #partnerService = inject(PartnerService);
  #planCreationStatusService = inject(PlanCreationStatusService);
  #mainPlanSettingsService = inject(MainPlanSettingsService);
  #planDetailService = inject(PlanDetailService);
  #planTermsDraft = inject(PlanTermsAndConditionsDraftService);
  #sentryLoggerService = inject(SentryLoggerService);
  #dialogService = inject(IgntDialogService);
  #toastService = inject(ToastService);
  readonly #fzTracking = inject(FzTrackingService);
  #translateService = inject(TranslateService);
  #savedTermsAndConditionsHtml = '';
  #userService = inject(UserService);
  #venueEditionComponent: PlanVenueEditionComponent | null = null;

  changeTab(tab: PlanEditionTabEnum): void {
    this.#pendingNavigation.set(false);
    this.#pendingNavigationFromTab.set(null);
    this.selectedTab.set(tab);
    this.showCompatibilityNote.set(this.#deviceService.getDeviceOS() === MobileOS.iOS && tab === PlanEditionTabEnum.Gallery);
  }

  onTabClick(tab: PlanEditionTabEnum): void {
    const previousTab = this.selectedTab();
    if (tab === previousTab) {
      return;
    }
    const planId = this.planId;
    if (planId !== null) {
      this.#fzTracking.track(
        clickPlanCreationContentTab({
          plan_id: planId,
          previous_tab: previousTab,
          tab,
        }),
      );
    }
    this.#confirmDiscardThenRun(() => this.changeTab(tab));
  }

  #currentTabHasUnsavedChanges(): boolean {
    switch (this.selectedTab()) {
      case PlanEditionTabEnum.Content:
        return this.#contentEditionComponent?.areChangesUnsaved() ?? false;
      case PlanEditionTabEnum.Gallery:
        return this.#galleryEditionComponent?.areChangesUnsaved() ?? false;
      case PlanEditionTabEnum.Venue:
        return this.#venueEditionComponent?.areChangesUnsaved() ?? false;
      case PlanEditionTabEnum.Tags:
        return this.#tagsEditionComponent?.areChangesUnsaved() ?? false;
      case PlanEditionTabEnum.Translations:
        return this.#translationsEditionComponent?.areChangesUnsaved() ?? false;
      case PlanEditionTabEnum.TermsAndConditions:
        return this.termsAndConditionsHtml() !== this.#savedTermsAndConditionsHtml;
      default:
        return false;
    }
  }

  #confirmDiscardThenRun(navigate: () => void): void {
    if (!this.#currentTabHasUnsavedChanges()) {
      navigate();
      return;
    }
    confirmDiscardUnsavedChanges(this.#dialogService, this.#translateService, this.#injector)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((discard?: boolean) => {
        if (discard === true) {
          this.#discardCurrentTabEdits();
          navigate();
        }
      });
  }

  #discardCurrentTabEdits(): void {
    if (this.selectedTab() !== PlanEditionTabEnum.TermsAndConditions) {
      return;
    }
    this.termsAndConditionsHtml.set(this.#savedTermsAndConditionsHtml);
    const id = this.planId;
    if (id !== null) {
      this.#planTermsDraft.setHtml(id, this.#savedTermsAndConditionsHtml);
    }
  }

  @ViewChild(PlanContentEditionComponent) set contentEdition(component: PlanContentEditionComponent) {
    this.#contentEditionComponent = component;
  }
  @ViewChild(PlanGalleryEditionComponent) set galleryEdition(component: PlanGalleryEditionComponent) {
    this.#galleryEditionComponent = component;
  }
  @ViewChild(PlanTagsEditionComponent) set tagsEdition(component: PlanTagsEditionComponent) {
    this.#tagsEditionComponent = component;
  }
  @ViewChild(PlanTranslationsEditionComponent) set translationsEdition(component: PlanTranslationsEditionComponent) {
    this.#translationsEditionComponent = component;
  }
  error: WritableSignal<boolean> = signal(false);
  isLoading: WritableSignal<boolean> = signal(false);
  @Output() navigateToSettings = new EventEmitter<void>();
  @Output() navigateToSetup = new EventEmitter<void>();
  planCreationStatus: WritableSignal<PlanCreationStatusData | null> = signal(null);
  planDetail: WritableSignal<Partial<PlanDetail>> = signal({});
  @Input() planId: number | null = null;
  planLoaded: WritableSignal<boolean> = signal(false);
  selectedTab: WritableSignal<PlanEditionTabEnum> = signal(PlanEditionTabEnum.Content);
  showCompatibilityNote: WritableSignal<boolean> = signal(false);
  tabs: WritableSignal<PlanEditionTab[]> = signal([]);
  termsAndConditionsHtml: WritableSignal<string> = signal('');

  #pendingNavigation: WritableSignal<boolean> = signal(false);
  #pendingNavigationFromTab: WritableSignal<PlanEditionTabEnum | null> = signal(null);

  PlanEditionTabEnum = PlanEditionTabEnum;

  setupProvider: Signal<SetupProvider | null> = computed(() => {
    const plan = this.planCreationStatus();
    return resolveSetupProvider(plan);
  });

  shouldShowInventory: Signal<boolean> = computed(() => {
    return this.setupProvider()?.shouldShowInventory ?? true;
  });

  continueButtonLabel: Signal<string> = computed(() => {
    const nextTab = this.#getNextVisibleTab();
    if (!nextTab) {
      return this.#translateService.instant('planEdition.continueToSettings');
    }
    switch (nextTab.id) {
      case PlanEditionTabEnum.Gallery:
        return this.#translateService.instant('planEdition.continueToMedia');
      case PlanEditionTabEnum.Venue:
        return this.#translateService.instant('planEdition.continueToVenue');
      case PlanEditionTabEnum.TermsAndConditions:
        return this.#translateService.instant('planEdition.continueToTermsAndConditions');
      case PlanEditionTabEnum.Translations:
        return this.#translateService.instant('planEdition.continueToTranslations');
      case PlanEditionTabEnum.Tags:
        return this.#translateService.instant('planEdition.continueToTags');
      default:
        return this.#translateService.instant('planEdition.continueToSettings');
    }
  });

  showBackButton: Signal<boolean> = computed(() => {
    const visibleTabs = this.#getVisibleTabs();
    const currentIndex = visibleTabs.findIndex(t => t.id === this.selectedTab());
    return currentIndex > 0;
  });

  isLastEditableTab(tab: PlanEditionTabEnum): boolean {
    const editableTabs = this.#getVisibleTabs().filter(t => t.id !== PlanEditionTabEnum.Translations && t.id !== PlanEditionTabEnum.Tags);
    const lastEditableTab = editableTabs[editableTabs.length - 1];
    return tab === lastEditableTab?.id;
  }

  ngOnDestroy(): void {
    this.#editingPlanService.reset();
  }

  ngOnInit(): void {
    this.#editingPlanService.setSaveContext('plan_creation');
    if (this.planId) {
      this.#loadPlanDetails(this.planId);
      this.#subscribeToSelectedPlanChanges();
    }
  }

  onBack(): void {
    this.#trackActionEvent('back');
    const previousTab = this.#getPreviousVisibleTab();
    this.#confirmDiscardThenRun(() => {
      if (previousTab) {
        this.changeTab(previousTab.id);
      } else {
        this.#navigateToCreationStatus();
      }
    });
  }

  onContinue(): void {
    if (!this.canEditPlan) {
      return;
    }
    this.#trackActionEvent('continue');
    if (this.selectedTab() === PlanEditionTabEnum.TermsAndConditions) {
      if (!this.#canPersistRequiredPurchaseTerms()) {
        return;
      }
      this.#pendingNavigation.set(true);
      this.#pendingNavigationFromTab.set(PlanEditionTabEnum.TermsAndConditions);
      this.#persistRequiredPurchaseTerms()
        .pipe(
          tap(() => this.onTabSaved()),
          catchError(() => {
            this.#pendingNavigation.set(false);
            this.#pendingNavigationFromTab.set(null);
            this.#toastService.add({
              autoHide: true,
              delay: 5000,
              message: this.#translateService.instant('planEdition.toast.termsSaveError'),
              sentiment: AlertSentiment.danger,
            });
            return EMPTY;
          }),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe();
      return;
    }
    const saved = this.#saveCurrentTab();
    if (saved) {
      this.#pendingNavigation.set(true);
      this.#pendingNavigationFromTab.set(this.selectedTab());
    } else {
      this.#confirmDiscardThenRun(() => this.#handleNavigation());
    }
  }

  get canEditPlan(): boolean {
    return this.#editingPlanService.canEditPlan();
  }

  onSaveDraft(): void {
    if (!this.canEditPlan) {
      return;
    }
    this.#trackActionEvent('saveDraft');
    if (this.selectedTab() === PlanEditionTabEnum.TermsAndConditions) {
      if (!this.#canPersistRequiredPurchaseTerms()) {
        return;
      }
      this.#persistRequiredPurchaseTerms()
        .pipe(
          tap(() => this.onTabSaved()),
          catchError(() => {
            this.#toastService.add({
              autoHide: true,
              delay: 5000,
              message: this.#translateService.instant('planEdition.toast.termsSaveError'),
              sentiment: AlertSentiment.danger,
            });
            return EMPTY;
          }),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe();
      return;
    }
    const saved = this.#saveCurrentTab();
    if (!saved) {
      this.#toastService.add({
        autoHide: true,
        delay: 3000,
        message: this.#translateService.instant('planEdition.toast.nothingToChange'),
        sentiment: AlertSentiment.info,
      });
    }
  }

  onTabSaveFailed(): void {
    this.#pendingNavigation.set(false);
    this.#pendingNavigationFromTab.set(null);
  }

  onTabSaved(): void {
    this.#toastService.add({
      autoHide: true,
      delay: 3000,
      message: this.#translateService.instant('planEdition.toast.changesSaved'),
      sentiment: AlertSentiment.positive,
    });

    if (!this.#pendingNavigation()) {
      return;
    }
    const originatingTab = this.#pendingNavigationFromTab();
    this.#pendingNavigation.set(false);
    this.#pendingNavigationFromTab.set(null);

    this.#confirmDiscardThenRun(() => {
      const nextTab = this.#getNextVisibleTabFrom(originatingTab);
      if (nextTab) {
        this.changeTab(nextTab.id);
      } else {
        this.#navigateToEventSettings();
      }
    });
  }

  onTermsAndConditionsHtmlChange(html: string): void {
    this.termsAndConditionsHtml.set(html);
    const id = this.planId;
    if (id !== null) {
      this.#planTermsDraft.setHtml(id, html);
    }
  }

  retryLoadPlan(): void {
    const id = this.planId;
    if (id) {
      this.#loadPlanDetails(id);
    }
  }

  @ViewChild(PlanVenueEditionComponent) set venueEdition(component: PlanVenueEditionComponent) {
    this.#venueEditionComponent = component;
  }

  #getNextVisibleTab(): PlanEditionTab | null {
    return this.#getNextVisibleTabFrom(this.selectedTab());
  }

  #getNextVisibleTabFrom(fromTab: PlanEditionTabEnum | null): PlanEditionTab | null {
    if (!fromTab) {
      return null;
    }
    const visibleTabs = this.#getVisibleTabs();
    const tabIndex = visibleTabs.findIndex(t => t.id === fromTab);
    return visibleTabs[tabIndex + 1] ?? null;
  }

  #getPreviousVisibleTab(): PlanEditionTab | null {
    const visibleTabs = this.#getVisibleTabs();
    const currentIndex = visibleTabs.findIndex(t => t.id === this.selectedTab());
    if (currentIndex <= 0) {
      return null;
    }
    return visibleTabs[currentIndex - 1] ?? null;
  }

  #getVisibleTabs(): PlanEditionTab[] {
    return this.tabs().filter(tab => this.#isTabVisible(tab));
  }

  #handleNavigation(): void {
    const nextTab = this.#getNextVisibleTab();
    if (nextTab) {
      this.changeTab(nextTab.id);
    } else {
      this.#navigateToEventSettings();
    }
  }

  #isTabVisible(tab: PlanEditionTab): boolean {
    if (tab.optimizely) {
      if (this.#optimizelyService.isFeatureEnabled(tab.optimizely) !== true) {
        return false;
      }
    }

    if (tab.id === PlanEditionTabEnum.Venue) {
      return this.#userService.hasPermission(Permissions.CAN_MANAGE_VENUES) || this.#hasCreationOrReviewPermission();
    }

    if (tab.permission) {
      return this.#userService.hasPermission(tab.permission);
    }

    return true;
  }

  #loadPlanDetails(planId: number): void {
    const partner = this.#partnerService.getPartner();

    if (!partner?.id) {
      this.error.set(true);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.error.set(false);
    this.planLoaded.set(false);

    this.#planDetailService
      .getPlanDetail(partner.id, planId)
      .pipe(
        tap((planDetail: PlanDetail) => {
          const selectOption: SelectOption = {
            id: planId,
            title: planDetail.name ?? '',
          };
          this.#editingPlanService.setSelectedPlanOption(selectOption);
          this.#editingPlanService.setSelectedPlanDetail(new BaseResponse(planDetail, null));
          this.planDetail.set({
            ...planDetail,
            partnerId: partner.id,
          });
        }),
        switchMap(() => this.#planCreationStatusService.getPlanCreationStatus(partner.id, planId)),
        switchMap((creationStatus: PlanCreationStatusData) => {
          if (!planRequiresTermsAndConditions(creationStatus)) {
            return of({ creationStatus, termsHtml: undefined as string | undefined });
          }
          return this.#mainPlanSettingsService.getMainPlanGeneralSettings(partner.id, planId).pipe(
            map(settings => ({
              creationStatus,
              termsHtml: settings.requiredPurchaseTerms ?? '',
            })),
            catchError(() => {
              this.#sentryLoggerService.logWarning('Error loading plan settings for terms and conditions');
              return of({ creationStatus, termsHtml: undefined as string | undefined });
            }),
          );
        }),
        tap(({ creationStatus, termsHtml }) => {
          this.planCreationStatus.set(creationStatus);
          this.planLoaded.set(true);
          if (termsHtml !== undefined) {
            this.#planTermsDraft.setHtml(planId, termsHtml);
            this.termsAndConditionsHtml.set(termsHtml);
            this.#savedTermsAndConditionsHtml = termsHtml;
          } else {
            const draftHtml = this.#planTermsDraft.getHtml(planId);
            this.termsAndConditionsHtml.set(draftHtml);
            this.#savedTermsAndConditionsHtml = draftHtml;
          }
          this.#updateTabs(this.planDetail(), creationStatus);
        }),
        catchError((error: unknown) => {
          this.#sentryLoggerService.logWarning('Error loading plan details');
          this.error.set(true);
          this.#editingPlanService.setSelectedPlanDetail(new BaseResponse(null!, error));
          return EMPTY;
        }),
        finalize(() => {
          this.isLoading.set(false);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #navigateToCreationStatus(): void {
    this.navigateToSetup.emit();
  }

  #navigateToEventSettings(): void {
    const planId = this.planId;
    if (planId !== null) {
      this.#fzTracking.track(completePlanCreationContentStep({ plan_id: planId }));
    }
    this.navigateToSettings.emit();
  }

  #trackActionEvent(action: 'back' | 'continue' | 'saveDraft'): void {
    const planId = this.planId;
    if (planId === null) {
      return;
    }
    const tab = this.selectedTab();
    switch (action) {
      case 'back':
        this.#fzTracking.track(clickPlanCreationBack({ plan_id: planId, tab }));
        return;
      case 'continue':
        this.#fzTracking.track(clickPlanCreationContinue({ plan_id: planId, tab }));
        return;
      case 'saveDraft':
        this.#fzTracking.track(clickPlanCreationSaveDraft({ plan_id: planId, tab }));
        return;
    }
  }

  #canPersistRequiredPurchaseTerms(): boolean {
    const partner = this.#partnerService.getPartner();
    return Boolean(partner?.id) && this.planId !== null;
  }

  #persistRequiredPurchaseTerms(): Observable<void> {
    const partner = this.#partnerService.getPartner();
    const id = this.planId;
    if (!partner?.id || id === null) {
      return EMPTY;
    }
    const html = this.termsAndConditionsHtml();
    return this.#mainPlanSettingsService.updateMainPlanGeneralSettings(partner.id, id, { requiredPurchaseTerms: html }).pipe(
      tap(() => {
        this.#planTermsDraft.setHtml(id, html);
        this.#savedTermsAndConditionsHtml = html;
      }),
    );
  }

  #saveCurrentTab(): boolean {
    const tab = this.selectedTab();

    switch (tab) {
      case PlanEditionTabEnum.Content:
        if (this.#contentEditionComponent?.canPublish()) {
          this.#contentEditionComponent.publish();
          return true;
        }
        break;
      case PlanEditionTabEnum.Gallery:
        if (this.#galleryEditionComponent?.canPublish()) {
          this.#galleryEditionComponent.publish();
          return true;
        }
        break;
      case PlanEditionTabEnum.Venue:
        if (this.#venueEditionComponent?.canPublish()) {
          this.#venueEditionComponent.publish();
          return true;
        }
        break;
      case PlanEditionTabEnum.Tags:
        if (this.#tagsEditionComponent?.canSave()) {
          this.#tagsEditionComponent.save();
          return true;
        }
        break;
      case PlanEditionTabEnum.Translations:
        if (this.#translationsEditionComponent?.saveCurrentTab()) {
          return true;
        }
        break;
    }

    return false;
  }

  #subscribeToSelectedPlanChanges(): void {
    this.#editingPlanService
      .getSelectedPlanChanged$()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        const id = this.planId;
        if (id) {
          this.#loadPlanDetails(id);
        }
      });
  }

  #updateTabs(planDetail: Partial<PlanDetail>, creationStatus: PlanCreationStatusData): void {
    this.tabs.set(
      PLAN_EDITION_TABS.filter(tab => {
        if (tab.id === PlanEditionTabEnum.Venue) {
          return planDetail.venues?.length === 1 && this.#isTabVisible(tab);
        }
        if (tab.id === PlanEditionTabEnum.TermsAndConditions) {
          return planRequiresTermsAndConditions(creationStatus);
        }
        return this.#isTabVisible(tab);
      }),
    );
  }

  #hasCreationOrReviewPermission(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS) || this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS)
    );
  }
}
