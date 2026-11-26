import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  signal,
  Signal,
  Type,
  untracked,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { EventSettingsRoutes } from '@fz-original/app/modules/event-settings/event-settings/event-settings-routes';
import { PlanErrorComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-error/plan-error.component';
import { confirmDiscardUnsavedChanges } from '@fz-original/app/shared/guard/has-unsaved-changes/unsaved-changes-confirm.util';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, of, Subscription, tap } from 'rxjs';

import { PlanReviewLockedBannerComponent } from '../../../../../shared/components/plan-review-locked-banner/plan-review-locked-banner.component';
import { PLAN_KIND_PERMISSIONS } from '../../../../../shared/models/plan/plan-kind-permissions.config';
import { PlanKind } from '../../../../../shared/models/plan/plan-kind.enum';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { PlanEditionLockService } from '../../../../../shared/services/plan-review/plan-edition-lock.service';
import { UserService } from '../../../../../shared/services/user/user.service';
import { PlanType } from '../../../../event-settings/models/general-section.enum';
import { MainPlanSettings } from '../../../../event-settings/models/main-plan-settings.model';
import { MainPlanSettingsService } from '../../../../event-settings/services/main-plan-settings.service';
import { PlanStepperComponent } from '../plan-stepper/plan-stepper.component';
import { PlanDynamicFieldsComponent } from './dynamic-fields/components/plan-dynamic-fields/plan-dynamic-fields.component';
import { PlanSettingsDynamicFieldsFacade } from './dynamic-fields/services/plan-settings-dynamic-fields.facade';
import { StandardSettingsComponent } from './plan_types/standard-settings/standard-settings.component';
import { hasOwnSettingsTabs, resolvePlanSettingsComponent } from './plan-settings-edit.resolver';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntIconComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    NgComponentOutlet,
    PlanErrorComponent,
    PlanDynamicFieldsComponent,
    PlanReviewLockedBannerComponent,
    PlanStepperComponent,
    TranslateModule,
  ],
  providers: [PlanSettingsDynamicFieldsFacade],
  selector: 'app-plan-settings-edit',
  standalone: true,
  styleUrls: ['./plan-settings-edit.component.scss'],
  templateUrl: './plan-settings-edit.component.html',
})
export class PlanSettingsEditComponent {
  #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #lockService = inject(PlanEditionLockService);
  readonly #dynamicFieldsFacade = inject(PlanSettingsDynamicFieldsFacade);
  readonly #translateService = inject(TranslateService);
  #mainPlanSettingsService = inject(MainPlanSettingsService);
  #partnerService = inject(PartnerService);
  #router = inject(Router);
  #userService = inject(UserService);

  readonly isLockedForEdition = this.#lockService.isLockedForEdition;
  readonly lockResolved = this.#lockService.lockResolved;
  readonly showLockedBanner = this.#lockService.showLockedBanner;

  static readonly MAIN_SETTINGS_TAB_INDEX = 0;
  static readonly CUSTOM_FIELDS_TAB_INDEX = 1;

  readonly #activeTabIndex = signal(PlanSettingsEditComponent.MAIN_SETTINGS_TAB_INDEX);
  readonly #isRefreshingSettings = signal(false);
  readonly #refreshSettingsFailed = signal(false);
  #refreshSubscription: Subscription | null = null;
  readonly #customFieldsDirty = signal(false);
  readonly #generalSettingsDirty = signal(false);
  readonly hasUnsavedChanges = computed(() => this.#generalSettingsDirty() || this.#customFieldsDirty());
  isLoading: WritableSignal<boolean> = signal(true);
  mode = input<'creation' | 'edit'>('creation');
  planId = input<number | null>(null);
  planCreationStatus = input<PlanCreationStatusData | null>(null);
  planSettings: WritableSignal<Partial<MainPlanSettings> | null> = signal(null);
  planType: WritableSignal<PlanType | null> = signal(null);

  canEditPlan: Signal<boolean> = computed(() => {
    if (this.mode() === 'edit') {
      const hasEditAccess =
        this.#userService.hasPermission(Permissions.CAN_EDIT_PLAN_SETTINGS) ||
        this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS) ||
        this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS);
      if (!hasEditAccess) {
        return false;
      }
    }
    const planType = this.planSettings()?.type as unknown as PlanKind | undefined;
    const requiredPermission = planType != null ? PLAN_KIND_PERMISSIONS[planType]?.edit : undefined;
    const hasPermission =
      !requiredPermission ||
      this.#userService.hasPermission(requiredPermission) ||
      this.#userService.hasPermission('can_manage_plan_reviews');
    return hasPermission && !this.#lockService.isLockedForEdition();
  });

  settingsComponent: Signal<Type<unknown> | null> = computed(() => {
    const planType = this.planType();
    if (!planType) {
      return null;
    }

    const resolvedComponent = resolvePlanSettingsComponent(planType);
    if (!resolvedComponent) {
      return null;
    }

    if (this.mode() === 'edit' && resolvedComponent !== StandardSettingsComponent && !this.#canViewPlanKind(planType)) {
      return null;
    }

    return resolvedComponent;
  });
  protected readonly activeTabIndex = this.#activeTabIndex.asReadonly();
  protected readonly isRefreshingSettings = this.#isRefreshingSettings.asReadonly();
  protected readonly refreshSettingsFailed = this.#refreshSettingsFailed.asReadonly();
  protected readonly CUSTOM_FIELDS_TAB_INDEX = PlanSettingsEditComponent.CUSTOM_FIELDS_TAB_INDEX;
  protected readonly MAIN_SETTINGS_TAB_INDEX = PlanSettingsEditComponent.MAIN_SETTINGS_TAB_INDEX;
  protected readonly settingsTabs = viewChild(IgntTabsComponent);
  protected readonly showSettingsTabs = computed(
    () => !hasOwnSettingsTabs(this.settingsComponent()) && this.#dynamicFieldsFacade.hasFields(),
  );
  protected readonly showStepper = computed(() => this.mode() === 'creation' && !hasOwnSettingsTabs(this.settingsComponent()));
  componentInputs: Signal<Record<string, unknown>> = computed(() => ({
    canEditPlan: this.canEditPlan(),
    mode: this.mode(),
    onFormDirtyChange: (dirty: boolean) => this.#generalSettingsDirty.set(dirty),
    planId: this.planId(),
    settings: this.planSettings(),
    planCreationStatus: this.planCreationStatus(),
    ...(this.showSettingsTabs() ? { continueToNextTab: (): void => this.#openCustomFieldsTab() } : {}),
  }));

  constructor() {
    effect(() => {
      const planId = this.planId();
      untracked(() => {
        if (planId) {
          this.#loadPlanSettings(planId);
        } else {
          this.isLoading.set(false);
          this.planSettings.set(null);
          this.planType.set(null);
        }
      });
    });

    effect(() => {
      const component = this.settingsComponent();
      if (
        this.mode() === 'edit' &&
        component &&
        component !== StandardSettingsComponent &&
        this.#router.url.includes(EventSettingsRoutes.OptionalSettings)
      ) {
        this.#router.navigate(['/event-settings', EventSettingsRoutes.MainSettings], {
          queryParamsHandling: 'preserve',
          replaceUrl: true,
        });
      }
    });
  }

  retryLoad(planId: number | null): void {
    if (!planId) {
      return;
    }
    this.#loadPlanSettings(planId);
  }

  protected retryRefreshSettings(): void {
    this.#refreshPlanSettings();
  }

  protected onCustomFieldsContinued(): void {
    this.#router.navigate(['/plans/dashboard', this.planId()]);
  }

  protected onCustomFieldsDirtyChange(dirty: boolean): void {
    this.#customFieldsDirty.set(dirty);
  }

  protected onTabIndexChange(index: number): void {
    const previousIndex = this.#activeTabIndex();
    if (!this.#isTabDirty(previousIndex)) {
      this.#selectTab(index);
      return;
    }

    const settingsTabs = this.settingsTabs();
    if (settingsTabs) {
      settingsTabs.selectedIndex = previousIndex;
    }
    confirmDiscardUnsavedChanges(this.#dialogService, this.#translateService, this.#injector)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(discard => {
        if (discard === true) {
          this.#discardTab(previousIndex);
          this.#selectTab(index);
        }
      });
  }

  #discardTab(index: number): void {
    if (index === PlanSettingsEditComponent.MAIN_SETTINGS_TAB_INDEX) {
      this.#generalSettingsDirty.set(false);
    } else {
      this.#customFieldsDirty.set(false);
    }
  }

  #isTabDirty(index: number): boolean {
    return index === PlanSettingsEditComponent.MAIN_SETTINGS_TAB_INDEX ? this.#generalSettingsDirty() : this.#customFieldsDirty();
  }

  #loadPlanSettings(planId: number): void {
    this.isLoading.set(true);
    this.planSettings.set(null);
    this.planType.set(null);

    const partner = this.#partnerService.getPartner();
    if (!partner) {
      this.isLoading.set(false);
      return;
    }

    this.#activeTabIndex.set(PlanSettingsEditComponent.MAIN_SETTINGS_TAB_INDEX);
    forkJoin([this.#mainPlanSettingsService.getMainPlanGeneralSettings(partner.id, planId), this.#dynamicFieldsFacade.load(planId)])
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        tap(([settings]: [Partial<MainPlanSettings> | null, unknown]) => {
          this.planSettings.set(settings);
          if (settings?.type) {
            this.planType.set(settings.type);
          }
          this.isLoading.set(false);
        }),
        catchError(() => {
          this.isLoading.set(false);
          return of(null);
        }),
      )
      .subscribe();
  }

  #canViewPlanKind(planType: PlanType): boolean {
    const kind = planType as unknown as PlanKind;
    const requiredPermission = PLAN_KIND_PERMISSIONS[kind]?.view;
    return (
      !requiredPermission ||
      this.#userService.hasPermission(requiredPermission) ||
      this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS)
    );
  }

  #openCustomFieldsTab(): void {
    this.#activeTabIndex.set(PlanSettingsEditComponent.CUSTOM_FIELDS_TAB_INDEX);
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }

  #refreshPlanSettings(): void {
    const partner = this.#partnerService.getPartner();
    const planId = this.planId();
    if (!partner || planId === null) {
      return;
    }

    this.#isRefreshingSettings.set(true);
    this.#refreshSettingsFailed.set(false);
    this.#refreshSubscription?.unsubscribe();
    this.#refreshSubscription = this.#mainPlanSettingsService
      .getMainPlanGeneralSettings(partner.id, planId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#refreshSettingsFailed.set(true);
          this.#isRefreshingSettings.set(false);
        },
        next: (settings: Partial<MainPlanSettings> | null) => {
          this.planSettings.set(settings);
          this.#isRefreshingSettings.set(false);
        },
      });
  }

  #selectTab(index: number): void {
    this.#activeTabIndex.set(index);
    if (index === PlanSettingsEditComponent.MAIN_SETTINGS_TAB_INDEX) {
      this.#refreshPlanSettings();
    }
  }
}
