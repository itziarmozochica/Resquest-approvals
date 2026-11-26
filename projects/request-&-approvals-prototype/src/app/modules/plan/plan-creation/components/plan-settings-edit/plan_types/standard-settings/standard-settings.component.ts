import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { EventAgreementsComponent } from '@fz-original/app/agreements/requirements/containers/event-agreements/event-agreements.component';
import { EventCustomerQuestionsComponent } from '@fz-original/app/modules/event-settings/customer-questions/containers/event-customer-questions/event-customer-questions.component';
import { EventSettingsRoutes } from '@fz-original/app/modules/event-settings/event-settings/event-settings-routes';
import {
  buildCancellationSettingsPayload,
  CancellationSettingsPayload,
  isFormValidIgnoringUneditableCancellationControls,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/cancellation-settings-payload.util';
import { resolvePlanSaveContext } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/resolve-plan-save-context.util';
import { showNothingToChangeToast } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/show-nothing-to-change-toast.util';
import { PlanStepperComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-stepper/plan-stepper.component';
import { saveMainPlanSettings } from '@fz-original/app/modules/plan/tracking/events/save-main-plan-settings.event';
import { PartnerTransportProviderSummary } from '@fz-original/app/modules/settings/shared/models/partner-transport-provider-summary.model';
import { PartnerTransportProviderService } from '@fz-original/app/modules/settings/shared/services/partner-transport-provider.service';
import { ActionsBarComponent } from '@fz-original/app/shared/components/actions-bar/actions-bar.component';
import { ConfirmationModalComponent } from '@fz-original/app/shared/components/confirmation-modal/confirmation-modal.component';
import { confirmDiscardUnsavedChanges } from '@fz-original/app/shared/guard/has-unsaved-changes/unsaved-changes-confirm.util';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PlanOption } from '@fz-original/app/shared/search-bar/models/plan-option.model';
import { SearchBarOptions } from '@fz-original/app/shared/search-bar/models/search-bar.options';
import { SearchFilter } from '@fz-original/app/shared/search-bar/models/search-filter.model';
import { SearchBarService } from '@fz-original/app/shared/search-bar/service/search-bar.service';
import { SearchFiltersService } from '@fz-original/app/shared/services/filters/search-filters.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TicketDeliverySettingsRule } from '@fz-original/app/shared/ticket-delivery-settings/models/ticket-delivery-settings.model';
import { TicketDeliverySettingsService } from '@fz-original/app/shared/ticket-delivery-settings/ticket-delivery-settings.service';
import { coercePositiveIntegerOrNull } from '@fz-original/app/shared/utils/number.util';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntAlertComponent, IgntDialogService } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, merge, Observable, of, tap } from 'rxjs';

import { createCancellationSettingsControls } from '../../../../../../event-settings/components/cancellation-settings-section/cancellation-settings-section.utils';
import {
  createDelayedTicketReleaseFormGroup,
  patchDelayedTicketReleaseFromRule,
  syncDelayedTicketReleaseValidators,
} from '../../../../../../event-settings/components/delayed-ticket-release-section/delayed-ticket-release-section.utils';
import { MainSettingsFormComponent } from '../../../../../../event-settings/components/main-settings-form/main-settings-form.component';
import { OptionalSettingsFormComponent } from '../../../../../../event-settings/components/optional-settings-form/optional-settings-form.component';
import { WaitingRoomValidationDisplayService } from '../../../../../../event-settings/components/optional-settings-form/waiting-room-section/services/waiting-room-validation-display/waiting-room-validation-display.service';
import {
  waitingRoomFormControlName,
  waitingRoomI18n,
} from '../../../../../../event-settings/components/optional-settings-form/waiting-room-section/waiting-room-section.constants';
import {
  WaitingRoomFormGroup,
  WaitingRoomFormValue,
} from '../../../../../../event-settings/components/optional-settings-form/waiting-room-section/waiting-room-section.types';
import {
  createWaitingRoomFormGroup,
  hasWaitingRoomId,
  setWaitingRoomDetailFieldsDisabled,
} from '../../../../../../event-settings/components/optional-settings-form/waiting-room-section/waiting-room-section.utils';
import { SettingsSidebarNavComponent } from '../../../../../../event-settings/components/settings-sidebar-nav/settings-sidebar-nav.component';
import { TicketSettingsFormComponent } from '../../../../../../event-settings/components/ticket-settings-form/ticket-settings-form.component';
import {
  TicketSettingsFormGroup,
  TicketSettingsFormValue,
} from '../../../../../../event-settings/components/ticket-settings-form/ticket-settings-form.types';
import {
  TransportConfigurationFormGroup,
  TransportConfigurationFormValue,
} from '../../../../../../event-settings/components/transport-configuration-section/transport-configuration-section.types';
import {
  isTransportConfigurationFormComplete,
  transportConfigurationRequiredWhenEnabledValidator,
} from '../../../../../../event-settings/components/transport-configuration-section/transport-configuration-section.utils';
import { PlanCategory, PlanType } from '../../../../../../event-settings/models/general-section.enum';
import { MainPlanRedirect } from '../../../../../../event-settings/models/main-plan-redirect.model';
import { MainPlanSettings } from '../../../../../../event-settings/models/main-plan-settings.model';
import { NavigationItem } from '../../../../../../event-settings/models/navigation-item.interface';
import { RequestGeneralReview } from '../../../../../../event-settings/models/post-purchase-section.enum';
import { SelectorSettingType, SessionSelectorType } from '../../../../../../event-settings/models/selector-session-section.enum';
import {
  CancellationSettingsSectionConfig,
  ContractSectionConfig,
  DEFAULT_MAIN_SETTINGS_STATE,
  DEFAULT_OTHER_SETTINGS_STATE,
  DEFAULT_TICKET_SETTINGS_STATE,
  ExternalPlatformsSectionConfig,
  MainSettingsState,
  OtherSettingsState,
  OverrideCapacitySectionConfig,
  ResaleSectionConfig,
  SettingsConfigs,
  TicketSettingsState,
  TransportSectionConfig,
} from '../../../../../../event-settings/models/settings-configs.model';
import { TransportConfiguration } from '../../../../../../event-settings/models/transport-configuration.model';
import { ValidationMethod, ValidationWindow } from '../../../../../../event-settings/models/validation-section.enum';
import { CancellationSettingsVisibilityService } from '../../../../../../event-settings/services/cancellation-settings-visibility.service';
import { MainPlanRedirectService } from '../../../../../../event-settings/services/main-plan-redirect.service';
import { MainPlanSettingsService } from '../../../../../../event-settings/services/main-plan-settings.service';
import { WaitingRoomVisibilityService } from '../../../../../../event-settings/services/waiting-room-visibility.service';
import {
  buildMainSettingsStateFromSettings,
  buildOtherSettingsStateFromSettings,
  buildSettingsConfigs,
  buildTicketSettingsStateFromSettings,
} from '../../../../../../event-settings/utils/settings-configs.builder';
import { shouldShowExternalPlatformsForPlanType } from '../../../../../../event-settings/utils/should-show-external-platforms-for-plan-type.util';
import { PlanDynamicFieldsComponent } from '../../dynamic-fields/components/plan-dynamic-fields/plan-dynamic-fields.component';
import { PlanSettingsDynamicFieldsFacade } from '../../dynamic-fields/services/plan-settings-dynamic-fields.facade';
import { BundleDiscountApplicationModeSettingsFacade } from '../../services/standard/bundle-discount-application-mode-settings-facade';
import { DeclarativeInventorySettingsFacade } from '../../services/standard/declarative-inventory-settings-facade';
import { TicketReleaseSettingsFacade } from '../../services/standard/ticket-release-settings-facade';
import { WaitingRoomSettingsFacade } from '../../services/standard/waiting-room-settings-facade';

type SearchBarResponse = BaseResponse<SearchBarOptions | null>;

interface MainSettingsFormValue {
  contractSection: {
    contracts: string[];
    partnershipType: string | undefined;
  };
  generalSettingsSection: {
    category: PlanCategory | undefined;
    cities: number[];
    type: PlanType | undefined;
  };
  pricesSection: {
    priceList: boolean;
    taxCalculation: boolean;
  };
  validationSection: {
    validationMethod: ValidationMethod;
    validationWindow: ValidationWindow;
  };
}

interface OtherSettingsFormValue {
  allowPublishingInOta: boolean;
  allowTicketCancellations: boolean;
  disallowIndexing: boolean;
  hoursBeforeSessionCancellationNotAllowed: number | null;
  overrideCapacityEnabled: boolean;
  overrideCapacityLimit: number | null;
  postPurchaseReview: RequestGeneralReview;
  redirectEnabled: boolean;
  redirectToId: number | null;
  selectorSettings: {
    calendar: boolean;
    continuousTime: boolean;
    labelFormat: string;
    session: SessionSelectorType;
    setting: SelectorSettingType;
  };
  transportConfiguration: TransportConfigurationFormValue;
  waitingRoom: WaitingRoomFormValue;
}

interface SettingsTab {
  ariaControlsId: string;
  elementId: string;
  id: 'main' | 'optional' | 'ticket' | 'customFields' | 'customerQuestions' | 'agreements';
  labelKey: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ActionsBarComponent,
    EventAgreementsComponent,
    EventCustomerQuestionsComponent,
    IgntAlertComponent,
    MainSettingsFormComponent,
    NgTemplateOutlet,
    OptionalSettingsFormComponent,
    PlanDynamicFieldsComponent,
    PlanStepperComponent,
    ReactiveFormsModule,
    SettingsSidebarNavComponent,
    TicketSettingsFormComponent,
    TranslateModule,
  ],
  providers: [WaitingRoomValidationDisplayService],
  selector: 'app-standard-settings',
  styleUrl: './standard-settings.component.scss',
  templateUrl: './standard-settings.component.html',
})
export class StandardSettingsComponent implements OnInit {
  readonly planId = input.required<number>();
  readonly settings = input.required<Partial<MainPlanSettings> | null>();
  readonly canEditPlan = input<boolean>(true);
  readonly mode = input<'creation' | 'edit'>('creation');
  readonly onFormDirtyChange = input<((dirty: boolean) => void) | undefined>(undefined);
  readonly planCreationStatus = input<PlanCreationStatusData | null>(null);

  readonly #cancellationSettingsVisibilityService = inject(CancellationSettingsVisibilityService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);
  readonly #mainPlanRedirectService = inject(MainPlanRedirectService);
  readonly #mainPlanSettingsService = inject(MainPlanSettingsService);
  readonly #modalService = inject(NgbModal);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #transportConfigurationFeatureEnabled: boolean =
    this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.TRANSPORT_CONFIGURATION,
      team: 'b2b-onsite',
    }) ?? false;
  readonly #partnerService = inject(PartnerService);
  readonly #partnerTransportProviderService = inject(PartnerTransportProviderService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #searchBarService = inject(SearchBarService);
  readonly #searchFiltersService = inject(SearchFiltersService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);
  readonly #ticketDeliverySettingsService = inject(TicketDeliverySettingsService);
  readonly #ticketReleaseSettingsFacade = inject(TicketReleaseSettingsFacade);
  readonly #bundleDiscountApplicationModeSettingsFacade = inject(BundleDiscountApplicationModeSettingsFacade);
  readonly #declarativeInventorySettingsFacade = inject(DeclarativeInventorySettingsFacade);
  readonly #waitingRoomSettingsFacade = inject(WaitingRoomSettingsFacade);
  readonly #waitingRoomValidationDisplayService = inject(WaitingRoomValidationDisplayService);
  readonly #waitingRoomVisibilityService = inject(WaitingRoomVisibilityService);

  readonly #tabRoutePaths: Record<SettingsTab['id'], EventSettingsRoutes> = {
    agreements: EventSettingsRoutes.Agreements,
    customerQuestions: EventSettingsRoutes.CustomerQuestions,
    customFields: EventSettingsRoutes.CustomFields,
    main: EventSettingsRoutes.MainSettings,
    optional: EventSettingsRoutes.OptionalSettings,
    ticket: EventSettingsRoutes.TicketSettings,
  };

  activeSection = signal('validation-section');
  activeTab = signal<SettingsTab['id']>('main');
  bundleDiscountApplicationModeVisible = signal(false);
  cities = signal<SelectOption[]>([]);
  mainSettingsState = signal<MainSettingsState>(DEFAULT_MAIN_SETTINGS_STATE);
  otherSettingsState = signal<OtherSettingsState>(DEFAULT_OTHER_SETTINGS_STATE);
  ticketSettingsState = signal<TicketSettingsState>(DEFAULT_TICKET_SETTINGS_STATE);
  plans = signal<PlanOption[]>([]);
  redirectSelectedCity = signal<SelectOption | null>(null);
  transportProviders = signal<PartnerTransportProviderSummary[]>([]);
  redirectSelectedPlan = signal<PlanOption | null>(null);
  protected readonly declarativeInventoryState = this.#declarativeInventorySettingsFacade.sectionState;
  protected readonly selfServiceSettingsVisible = computed(() => this.#userService.getUser()?.isStaff() === true);
  otherSettingsForm: FormGroup = this.#formBuilder.group({
    allowPublishingInOta: [true],
    ...createCancellationSettingsControls({ allowTicketCancellations: false, hoursBeforeSessionCancellationNotAllowed: null }),
    bundleDiscountApplicationMode: [false],
    declarativeInventory: [false],
    disallowIndexing: [false],
    overrideCapacityEnabled: [false],
    overrideCapacityLimit: [null as number | null],
    postPurchaseReview: [null as RequestGeneralReview | null],
    redirectEnabled: [false],
    redirectToId: [null as number | null],
    selectorSettings: [
      {
        calendar: false,
        continuousTime: false,
        labelFormat: '',
        session: SessionSelectorType.DateTime,
        setting: SelectorSettingType.SingleVertical,
      },
    ],
    transportConfiguration: new FormGroup(
      {
        enabled: new FormControl(false, { nonNullable: true }),
        externalEventId: new FormControl('', { nonNullable: true }),
        transportProviderId: new FormControl<number | null>(null),
      },
      { validators: [transportConfigurationRequiredWhenEnabledValidator()] },
    ) as TransportConfigurationFormGroup,
    [waitingRoomFormControlName]: createWaitingRoomFormGroup(),
  });
  ticketSettingsForm: TicketSettingsFormGroup = new FormGroup({
    allowInvitationReselling: new FormControl<boolean>(false, { nonNullable: true }),
    delayedTicketRelease: createDelayedTicketReleaseFormGroup(),
    resellingProvider: new FormControl<string | null>(null),
  });
  ticketDeliveryRule = signal<TicketDeliverySettingsRule | null>(null);
  fallbackTimezone = signal<string>('');
  fallbackFirstActiveTimeSlot = signal<string | null>(null);
  delayedTicketReleaseVisible = this.#userService.hasPermission(Permissions.CAN_EDIT_TICKET_DELIVERY_SETTINGS);
  redirectEnabled = toSignal(this.otherSettingsForm.controls['redirectEnabled'].valueChanges, {
    initialValue: false,
  });
  settingsConfigs = computed<SettingsConfigs>(() =>
    buildSettingsConfigs(this.mainSettingsState(), this.otherSettingsState(), this.ticketSettingsState(), {
      cities: this.cities(),
      plans: this.plans(),
      redirectEnabled: this.redirectEnabled() ?? false,
      redirectSelectedCity: this.redirectSelectedCity(),
      redirectSelectedPlan: this.redirectSelectedPlan(),
    }),
  );
  contractConfig = computed<ContractSectionConfig | null>(() => this.settingsConfigs().contract, {
    equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
  #transportProvidersFetched = false;

  readonly #agreementsDirty = signal(false);
  readonly #customFieldsDirty = signal(false);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #dynamicFieldsFacade = inject(PlanSettingsDynamicFieldsFacade, { optional: true });
  readonly #optimizelyFeatureUiRevision = signal(0);
  readonly #pristineValues = signal<Partial<Record<'main' | 'other' | 'ticket', unknown>>>({});
  overrideCapacitySectionConfig = computed<OverrideCapacitySectionConfig | null>(() => {
    this.#optimizelyFeatureUiRevision();
    const config = this.settingsConfigs().overrideCapacity;
    if (!config) {
      return null;
    }
    if (!(this.#optimizelyService.isFeatureEnabled(FeatureFlags.OVERRIDE_CAPACITY_FEATURE) ?? false)) {
      return null;
    }
    return config;
  });
  cancellationSettingsSectionConfig = computed<CancellationSettingsSectionConfig | null>(() => {
    const config = this.settingsConfigs().cancellations;
    if (config === null || !this.#cancellationSettingsVisibilityService.canView(this.otherSettingsState())) {
      return null;
    }
    return config;
  });
  transportSectionConfig = computed<TransportSectionConfig | null>(() => {
    if (!this.#transportConfigurationFeatureEnabled) {
      return null;
    }
    return this.settingsConfigs().transport;
  });
  externalPlatformsSectionConfig = computed<ExternalPlatformsSectionConfig | null>(() => {
    if (!shouldShowExternalPlatformsForPlanType(this.planType())) {
      return null;
    }
    return this.settingsConfigs().externalPlatforms;
  });
  resaleSectionConfig = computed<ResaleSectionConfig | null>(() => this.settingsConfigs().resale);

  navigationItems = computed<NavigationItem[]>(() => {
    const mainState = this.mainSettingsState();
    const otherState = this.otherSettingsState();
    const tab = this.activeTab();

    if (tab === 'main') {
      return [
        {
          condition: mainState.hasFields.generalSettings,
          id: 'general-settings-section',
          labelKey: 'eventSettings.general.title',
        },
        {
          condition: mainState.hasFields.validation,
          id: 'validation-section',
          labelKey: 'eventSettings.validation.title',
        },
        {
          condition: mainState.hasFields.contract,
          id: 'contract-section',
          labelKey: 'eventSettings.contract.title',
        },
        {
          condition: mainState.hasFields.prices,
          id: 'prices-section',
          labelKey: 'eventSettings.prices.heading',
        },
      ];
    }

    if (tab === 'ticket') {
      return [
        {
          condition: this.delayedTicketReleaseVisible,
          id: 'delayed-ticket-release-section',
          labelKey: 'eventSettings.delayedTicketRelease.title',
        },
        {
          condition: this.resaleSectionConfig() !== null,
          id: 'resale-section',
          labelKey: 'eventSettings.resale.title',
        },
      ];
    }

    const hasAnySelectorField =
      otherState.hasFields.calendarSelector ||
      otherState.hasFields.continuousTimeSelector ||
      otherState.hasFields.sessionSelectorType ||
      otherState.hasFields.selectorSettingType ||
      otherState.hasFields.labelFormat;

    return [
      {
        condition: hasAnySelectorField,
        id: 'selector-settings-section',
        labelKey: 'eventSettings.selector.title',
      },
      {
        condition: this.externalPlatformsSectionConfig() !== null,
        id: 'external-platforms-section',
        labelKey: 'eventSettings.externalPlatforms',
      },
      {
        condition: this.transportSectionConfig() !== null,
        id: 'transport-configuration-section',
        labelKey: 'eventSettings.transportConfiguration.title',
      },
      {
        condition: otherState.hasFields.postPurchaseReview,
        id: 'post-purchase-section',
        labelKey: 'eventSettings.postPurchase.title',
      },
      {
        condition: this.cancellationSettingsSectionConfig() !== null,
        id: 'cancellation-settings-section',
        labelKey: 'eventSettings.cancellations.title',
      },
      {
        condition: otherState.hasFields.redirectToId || otherState.hasFields.disallowIndexing,
        id: 'indexing-section',
        labelKey: 'eventSettings.indexing.title',
      },
      {
        condition: this.overrideCapacitySectionConfig() !== null,
        id: 'override-capacity-section',
        labelKey: 'eventSettings.overrideCapacity.title',
      },
      {
        condition: this.#waitingRoomVisibilityService.canViewWaitingRoomConfig(),
        id: 'waiting-room-section',
        labelKey: `${waitingRoomI18n}.title`,
      },
      {
        condition: this.bundleDiscountApplicationModeVisible(),
        id: 'bundle-discount-application-mode-section',
        labelKey: 'eventSettings.bundleDiscountApplicationMode.title',
      },
      {
        condition: this.#userService.getUser()?.isStaff() ?? false,
        id: 'self-service-settings-section',
        labelKey: 'eventSettings.selfService.title',
      },
    ];
  });
  isPlanDraft = signal<boolean | null>(null);
  isSaving: WritableSignal<boolean> = signal(false);

  mainPlanRedirect: MainPlanRedirect | null = null;

  planName = '';

  planType = signal<PlanType | undefined>(undefined);

  protected readonly showMainTab = computed<boolean>(() => this.mode() === 'creation' || this.mode() === 'edit');
  protected readonly showOptionalTab = computed<boolean>(() => this.mode() === 'creation' || this.mode() === 'edit');
  protected readonly showTicketTab = computed<boolean>(() => this.mode() === 'creation' || this.mode() === 'edit');
  protected readonly showCustomFieldsTab = computed<boolean>(() => this.#dynamicFieldsFacade?.hasFields() ?? false);
  protected readonly showCustomerQuestionsTab = computed<boolean>(() => {
    return this.#userService.hasPermission(Permissions.CAN_VIEW_BOOKING_QUESTIONS);
  });
  protected readonly showAgreementsTab = computed<boolean>(() => {
    // The flag reads `null` until Optimizely has its user and plan data, so follow the same refresh
    // the other flag-gated UI here samples: without it the tab stays hidden for the whole session.
    this.#optimizelyFeatureUiRevision();
    return (
      this.mode() === 'edit' &&
      (this.#optimizelyService.isFeatureEnabled(FeatureFlags.AGREEMENTS_VIEW) ?? false) &&
      this.#userService.hasPermission(Permissions.CAN_MANAGE_AGREEMENTS)
    );
  });
  protected readonly tabs = computed<SettingsTab[]>(() => {
    const tabs: SettingsTab[] = [];
    if (this.showMainTab()) {
      tabs.push({
        ariaControlsId: 'main-settings-panel',
        elementId: 'tab-main-settings',
        id: 'main',
        labelKey: 'planSettings.mainSettings',
      });
    }
    if (this.showOptionalTab()) {
      tabs.push({
        ariaControlsId: 'optional-settings-panel',
        elementId: 'tab-optional-settings',
        id: 'optional',
        labelKey: 'planSettings.optionalSettings',
      });
    }
    if (this.showTicketTab()) {
      tabs.push({
        ariaControlsId: 'ticket-settings-panel',
        elementId: 'tab-ticket-settings',
        id: 'ticket',
        labelKey: 'planSettings.ticketSettings',
      });
    }
    if (this.showCustomFieldsTab()) {
      tabs.push({
        ariaControlsId: 'custom-fields-panel',
        elementId: 'tab-custom-fields',
        id: 'customFields',
        labelKey: 'dynamicFields.tabs.customFields',
      });
    }
    if (this.showCustomerQuestionsTab()) {
      tabs.push({
        ariaControlsId: 'customer-questions-panel',
        elementId: 'tab-customer-questions',
        id: 'customerQuestions',
        labelKey: 'planSettings.customerQuestions',
      });
    }
    if (this.showAgreementsTab()) {
      tabs.push({
        ariaControlsId: 'agreements-panel',
        elementId: 'tab-agreements',
        id: 'agreements',
        labelKey: 'planSettings.agreements',
      });
    }
    return tabs;
  });

  constructor() {
    effect(() => {
      this.#applyCanEditPlanToForms(this.canEditPlan());
    });
  }

  loadAllowedTypesFromSettings(settings: Partial<MainPlanSettings> | null): void {
    if (settings) {
      this.#setPermissionsFromSettings(settings);
      this.#patchFormValues(settings);

      if (this.otherSettingsState().hasFields.transportConfiguration && this.#transportConfigurationFeatureEnabled) {
        this.#fetchTransportProvidersIfNeeded();
      }

      if (this.delayedTicketReleaseVisible) {
        this.#fetchTicketDeliverySettings();
      }
      this.#rememberPristineValues();
    }
  }

  ngOnInit(): void {
    if (this.mode() === 'creation') {
      this.isPlanDraft.set(true);
    } else {
      const tabFromRoute = this.#route.snapshot.data['tab'];
      if (this.tabs().find(tab => tab.id === tabFromRoute)) {
        this.activeTab.set(tabFromRoute);
      }
    }

    if (!this.tabs().find(tab => tab.id === this.activeTab())) {
      this.activeTab.set(this.tabs()[0].id);
    }

    this.#initializeFromFilters(this.planId());
    this.#loadBundleDiscountApplicationMode();
    if (this.selfServiceSettingsVisible()) {
      this.#loadDeclarativeInventory();
    }
    this.#subscribeToGeneralSettingsChanges();
    this.#subscribeToFormDirtyState();
    this.#subscribeToOptimizelyFeatureRefresh();
  }

  onAllowPublishingInOtaChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const allowPublishingInOta = target.checked;
    this.otherSettingsForm.patchValue({ allowPublishingInOta });

    const modal = this.#modalService.open(ConfirmationModalComponent);
    modal.componentInstance.title = this.#translateService.instant('eventSettings.allowPublishingInOta.modalTitle');
    modal.componentInstance.note = this.#translateService.instant('eventSettings.allowPublishingInOta.modalNote');

    if (allowPublishingInOta) {
      this.#configureFromDenyToAllowModal(modal);
    } else {
      this.#configureFromAllowToDenyModal(modal);
    }

    this.otherSettingsForm.markAsDirty();
  }

  mainSettingsForm: FormGroup = this.#formBuilder.group({
    contractSection: [
      {
        contractId: undefined as string | undefined,
        contracts: [] as string[],
        partnershipType: undefined as string | undefined,
      },
    ],
    generalSettingsSection: [{ category: undefined as string | undefined, cities: [] as number[], type: undefined as string | undefined }],
    pricesSection: [{ priceList: false, taxCalculation: false }],
    validationSection: [{ validationMethod: ValidationMethod.PARTNERS_APP, validationWindow: ValidationWindow.STANDARD_TIME }],
  });

  allowPublishingInOtaValue = toSignal(this.otherSettingsForm.controls['allowPublishingInOta'].valueChanges, {
    initialValue: true,
  });

  overrideCapacityEnabled = toSignal(this.otherSettingsForm.controls['overrideCapacityEnabled'].valueChanges, {
    initialValue: false,
  });

  onBack(): void {
    if (this.activeTab() === 'ticket') {
      this.setActiveTab(this.showOptionalTab() ? 'optional' : 'main');
      return;
    }
    this.setActiveTab('main');
  }

  onContinue(): void {
    if (!this.canEditPlan() || this.isSaving()) {
      return;
    }

    if (!this.mainSettingsForm.valid) {
      this.mainSettingsForm.markAllAsTouched();
      return;
    }

    this.setActiveTab(this.showOptionalTab() ? 'optional' : this.showTicketTab() ? 'ticket' : 'main');
  }

  onContinueAction(): void {
    const tab = this.activeTab();
    if (tab === 'ticket') {
      this.onContinueTicket();
      return;
    }
    if (tab === 'optional') {
      this.onContinueOptional();
      return;
    }
    this.onContinue();
  }

  onContinueOptional(): void {
    if (!this.canEditPlan() || this.isSaving()) {
      return;
    }

    if (this.showTicketTab()) {
      this.setActiveTab('ticket');
      return;
    }

    this.#saveSettings({
      navigateOnSuccess: this.mode() === 'creation',
      successMessageKey: 'planSettings.success.settingsSaved',
    });
  }

  onContinueTicket(): void {
    if (!this.canEditPlan() || this.isSaving()) {
      return;
    }

    this.#saveSettings({
      navigateOnSuccess: this.mode() === 'creation',
      successMessageKey: 'planSettings.success.settingsSaved',
    });
  }

  onOverrideCapacityEnabledChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.otherSettingsForm.patchValue({ overrideCapacityEnabled: target.checked });
    this.otherSettingsForm.markAsDirty();
  }

  onOverrideCapacityLimitChange(value: number | null): void {
    this.otherSettingsForm.patchValue({ overrideCapacityLimit: coercePositiveIntegerOrNull(value) });
    this.otherSettingsForm.markAsDirty();
  }

  onRedirectConfigChange(redirectToId: number | null): void {
    this.otherSettingsForm.patchValue({ redirectToId });
    this.otherSettingsForm.markAsDirty();

    if (redirectToId != null) {
      this.#setRedirectSelectedPlan(redirectToId);
    } else {
      this.redirectSelectedPlan.set(null);
      this.redirectSelectedCity.set(null);
    }
  }

  onRedirectEnabledChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.otherSettingsForm.patchValue({ redirectEnabled: target.checked });
    this.otherSettingsForm.markAsDirty();
  }

  onSaveDraft(): void {
    if (!this.canEditPlan() || this.isSaving()) {
      return;
    }

    const hasChanges = this.mainSettingsForm.dirty || this.otherSettingsForm.dirty || this.ticketSettingsForm.dirty;

    if (!hasChanges) {
      showNothingToChangeToast(this.#toastService, this.#translateService);
      return;
    }

    this.#saveSettings({
      navigateOnSuccess: false,
      successMessageKey: 'planSettings.success.draftSaved',
    });
  }

  onSaveSettings(): void {
    if (!this.canEditPlan() || this.isSaving()) {
      return;
    }

    const hasChanges = this.mainSettingsForm.dirty || this.otherSettingsForm.dirty || this.ticketSettingsForm.dirty;

    if (!hasChanges) {
      showNothingToChangeToast(this.#toastService, this.#translateService);
      return;
    }

    this.#saveSettings({
      navigateOnSuccess: false,
      successMessageKey: this.mode() === 'edit' ? 'eventSettings.successMessage' : 'planSettings.success.settingsSaved',
    });
  }

  onTabKeyDown(event: KeyboardEvent, tab: SettingsTab['id']): void {
    const key = event.key;

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.setActiveTab(tab);
      return;
    }

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      const tabs = this.tabs();
      const currentIndex = tabs.findIndex(t => t.id === tab);
      if (currentIndex === -1) {
        return;
      }
      const direction = key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      this.setActiveTab(nextTab.id);

      const nextTabId = nextTab.elementId;
      const nextTabElement = document.getElementById(nextTabId);
      if (nextTabElement) {
        nextTabElement.focus();
      }
    }
  }

  onTransportEnabledChange(enabled: boolean): void {
    if (!this.#transportConfigurationFeatureEnabled) {
      return;
    }
    if (enabled) {
      this.#fetchTransportProvidersIfNeeded();
    }
    this.otherSettingsForm.markAsDirty();
  }

  protected readonly onAgreementsDirtyChange = (dirty: boolean): void => {
    this.#agreementsDirty.set(dirty);
    this.#emitDirtyState();
  };

  setActiveTab(tab: SettingsTab['id']): void {
    if (this.mode() === 'edit') {
      const path = this.#tabRoutePaths[tab];

      this.#router
        .navigate(['/event-settings', path], {
          queryParamsHandling: 'preserve',
        })
        .then(navigated => {
          if (navigated) {
            this.#setActiveTabAndScroll(tab);
          }
        });
    } else {
      this.#confirmTabChangeThenRun(tab, () => this.#setActiveTabAndScroll(tab));
    }
  }

  protected onCustomFieldsContinued(): void {
    this.#router.navigate(['/plans/dashboard'], { queryParams: { planId: this.planId() } });
  }

  protected onCustomFieldsDirtyChange(dirty: boolean): void {
    this.#customFieldsDirty.set(dirty);
    this.#emitDirtyState();
  }

  #applyCanEditPlanToForms(canEditPlan: boolean): void {
    if (canEditPlan) {
      this.mainSettingsForm.enable({ emitEvent: false });
      this.otherSettingsForm.enable({ emitEvent: false });
      this.#syncWaitingRoomDetailFieldsDisabledAfterOtherSettingsEnable();
      this.ticketSettingsForm.enable({ emitEvent: false });
    } else {
      this.mainSettingsForm.disable({ emitEvent: false });
      this.otherSettingsForm.disable({ emitEvent: false });
      this.ticketSettingsForm.disable({ emitEvent: false });
    }
  }

  #confirmTabChangeThenRun(tab: SettingsTab['id'], run: () => void): void {
    const isLeavingDirtyCustomFields = this.activeTab() === 'customFields' && tab !== 'customFields' && this.#customFieldsDirty();
    const isEnteringCustomFieldsWithDirtySettings =
      tab === 'customFields' &&
      this.activeTab() !== 'customFields' &&
      (this.mainSettingsForm.dirty || this.otherSettingsForm.dirty || this.ticketSettingsForm.dirty);

    if (!isLeavingDirtyCustomFields && !isEnteringCustomFieldsWithDirtySettings) {
      run();
      return;
    }

    confirmDiscardUnsavedChanges(this.#dialogService, this.#translateService, this.#injector)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(discard => {
        if (discard !== true) {
          return;
        }
        if (isLeavingDirtyCustomFields) {
          this.#customFieldsDirty.set(false);
        }
        if (isEnteringCustomFieldsWithDirtySettings) {
          this.#discardSettingsForms();
        }
        this.#emitDirtyState();
        run();
      });
  }

  #discardSettingsForms(): void {
    const pristineValues = this.#pristineValues();
    Object.entries(this.#settingsForms()).forEach(([key, form]) =>
      form.reset(pristineValues[key as keyof typeof pristineValues] ?? form.getRawValue()),
    );
    const redirectToId: number | null = this.otherSettingsForm.getRawValue().redirectToId;
    if (redirectToId != null) {
      this.#setRedirectSelectedPlan(redirectToId);
    } else {
      this.redirectSelectedPlan.set(null);
      this.redirectSelectedCity.set(null);
    }
  }

  #getDeclarativeInventoryControl(): FormControl<boolean> | null {
    return this.otherSettingsForm.get('declarativeInventory') as FormControl<boolean> | null;
  }

  #rememberPristineValues(): void {
    const pristineValues = Object.entries(this.#settingsForms())
      .filter(([, form]) => form.pristine)
      .map(([key, form]) => [key, form.getRawValue()]);
    this.#pristineValues.update(values => ({ ...values, ...Object.fromEntries(pristineValues) }));
  }

  #settingsForms(): Record<'main' | 'other' | 'ticket', AbstractControl> {
    return { main: this.mainSettingsForm, other: this.otherSettingsForm, ticket: this.ticketSettingsForm };
  }

  #syncWaitingRoomDetailFieldsDisabledAfterOtherSettingsEnable(): void {
    const waitingRoomForm = this.otherSettingsForm.get(waitingRoomFormControlName) as WaitingRoomFormGroup | null;
    if (!waitingRoomForm) {
      return;
    }
    setWaitingRoomDetailFieldsDisabled(waitingRoomForm, hasWaitingRoomId(waitingRoomForm.controls.waitingRoomId.value));
  }

  #buildMainSettingsPayload(mainFormValues: MainSettingsFormValue): Partial<MainPlanSettings> {
    const settings = this.settings();
    if (!settings) {
      return {};
    }

    const mainState = this.mainSettingsState();
    const payload: Partial<MainPlanSettings> = {};

    if (mainFormValues.generalSettingsSection) {
      if (
        mainState.permissions.canEditType &&
        mainFormValues.generalSettingsSection.type !== undefined &&
        settings.type !== mainFormValues.generalSettingsSection.type
      ) {
        payload.type = mainFormValues.generalSettingsSection.type;
      }
      if (
        mainState.permissions.canEditCategory &&
        mainFormValues.generalSettingsSection.category !== undefined &&
        settings.category !== mainFormValues.generalSettingsSection.category
      ) {
        payload.category = mainFormValues.generalSettingsSection.category;
      }
      if (
        mainState.permissions.canEditCities &&
        mainFormValues.generalSettingsSection.cities !== undefined &&
        JSON.stringify(settings.cities ?? []) !== JSON.stringify(mainFormValues.generalSettingsSection.cities ?? [])
      ) {
        payload.cities = mainFormValues.generalSettingsSection.cities;
      }
    }

    if (mainFormValues.validationSection) {
      if (
        mainState.permissions.canEditValidationMethod &&
        mainFormValues.validationSection.validationMethod !== undefined &&
        settings.validationMethod !== mainFormValues.validationSection.validationMethod
      ) {
        payload.validationMethod = mainFormValues.validationSection.validationMethod;
      }
      if (
        mainState.permissions.canEditValidationWindow &&
        mainFormValues.validationSection.validationWindow !== undefined &&
        settings.validationWindow !== mainFormValues.validationSection.validationWindow
      ) {
        payload.validationWindow = mainFormValues.validationSection.validationWindow;
      }
    }

    if (
      mainState.permissions.canEditPartnershipType &&
      mainFormValues.contractSection?.partnershipType !== undefined &&
      settings.partnershipType !== mainFormValues.contractSection.partnershipType
    ) {
      payload.partnershipType = mainFormValues.contractSection.partnershipType;
    }

    if (
      mainState.permissions.canEditContracts &&
      mainFormValues.contractSection?.contracts !== undefined &&
      JSON.stringify(settings.contracts ?? []) !== JSON.stringify(mainFormValues.contractSection.contracts ?? [])
    ) {
      payload.contracts = mainFormValues.contractSection.contracts;
    }

    if (mainFormValues.pricesSection) {
      if (
        mainState.permissions.canEditTaxCalculation &&
        mainFormValues.pricesSection.taxCalculation !== undefined &&
        settings.mustUseTaxBase !== mainFormValues.pricesSection.taxCalculation
      ) {
        payload.mustUseTaxBase = mainFormValues.pricesSection.taxCalculation;
      }
      if (
        mainState.permissions.canEditPriceList &&
        mainFormValues.pricesSection.priceList !== undefined &&
        settings.hasPriceListPricing !== mainFormValues.pricesSection.priceList
      ) {
        payload.hasPriceListPricing = mainFormValues.pricesSection.priceList;
      }
    }

    return payload;
  }

  #buildCancellationSettingsPayload(otherFormValues: OtherSettingsFormValue): CancellationSettingsPayload {
    const settings = this.settings();
    const otherState = this.otherSettingsState();
    const savedAllowTicketCancellations = settings?.allowTicketCancellations;
    if (settings === null || savedAllowTicketCancellations === undefined || this.cancellationSettingsSectionConfig() === null) {
      return {};
    }

    const { allowTicketCancellations, hoursBeforeSessionCancellationNotAllowed } = buildCancellationSettingsPayload(
      {
        allowTicketCancellations: savedAllowTicketCancellations,
        hoursBeforeSessionCancellationNotAllowed: settings.hoursBeforeSessionCancellationNotAllowed ?? null,
      },
      {
        allowTicketCancellations: otherFormValues.allowTicketCancellations,
        hoursBeforeSessionCancellationNotAllowed: otherFormValues.hoursBeforeSessionCancellationNotAllowed,
      },
    );

    return {
      ...(otherState.permissions.canEditAllowTicketCancellations && allowTicketCancellations !== undefined && { allowTicketCancellations }),
      ...(otherState.permissions.canEditHoursBeforeSessionCancellationNotAllowed &&
        hoursBeforeSessionCancellationNotAllowed !== undefined && { hoursBeforeSessionCancellationNotAllowed }),
    };
  }

  #buildOtherSettingsPayload(
    otherFormValues: OtherSettingsFormValue,
    cancellationSettings: CancellationSettingsPayload = this.#buildCancellationSettingsPayload(otherFormValues),
  ): Partial<MainPlanSettings> {
    const settings = this.settings();
    if (!settings) {
      return {};
    }

    const otherState = this.otherSettingsState();
    const payload: Partial<MainPlanSettings> = { ...cancellationSettings };

    if (
      otherState.permissions.canEditRequestGeneralReview &&
      otherFormValues.postPurchaseReview !== undefined &&
      settings.requestGeneralReview !== otherFormValues.postPurchaseReview
    ) {
      payload.requestGeneralReview = otherFormValues.postPurchaseReview;
    }

    if (
      otherState.permissions.canEditDisallowIndexing &&
      otherFormValues.disallowIndexing !== undefined &&
      settings.disallowIndexing !== otherFormValues.disallowIndexing
    ) {
      payload.disallowIndexing = otherFormValues.disallowIndexing;
    }

    if (otherState.permissions.canEditOverrideCapacityLimit) {
      const rawLimit = otherFormValues.overrideCapacityEnabled ? otherFormValues.overrideCapacityLimit : null;
      const newLimit = coercePositiveIntegerOrNull(rawLimit);
      const previousLimit = coercePositiveIntegerOrNull(settings.overrideCapacityLimit);
      if (previousLimit !== newLimit) {
        payload.overrideCapacityLimit = newLimit;
      }
    }

    if (
      shouldShowExternalPlatformsForPlanType(this.planType()) &&
      otherState.permissions.canEditDenyPublishingInOta &&
      otherFormValues.allowPublishingInOta !== undefined &&
      settings.denyPublishingInOta !== !otherFormValues.allowPublishingInOta
    ) {
      payload.denyPublishingInOta = !otherFormValues.allowPublishingInOta;
    }

    if (otherFormValues.selectorSettings) {
      if (
        otherState.permissions.canEditCalendarSelector &&
        otherFormValues.selectorSettings.calendar !== undefined &&
        settings.calendarSelector !== otherFormValues.selectorSettings.calendar
      ) {
        payload.calendarSelector = otherFormValues.selectorSettings.calendar;
      }
      if (
        otherState.permissions.canEditContinuousTimeSelector &&
        otherFormValues.selectorSettings.continuousTime !== undefined &&
        settings.continuousTimeSelector !== otherFormValues.selectorSettings.continuousTime
      ) {
        payload.continuousTimeSelector = otherFormValues.selectorSettings.continuousTime;
      }
      if (
        otherState.permissions.canEditLabelFormat &&
        otherFormValues.selectorSettings.labelFormat !== undefined &&
        settings.labelFormat !== otherFormValues.selectorSettings.labelFormat
      ) {
        payload.labelFormat = otherFormValues.selectorSettings.labelFormat;
      }
      if (
        otherState.permissions.canEditSessionSelectorType &&
        otherFormValues.selectorSettings.session !== undefined &&
        settings.sessionSelectorType !== otherFormValues.selectorSettings.session
      ) {
        payload.sessionSelectorType = otherFormValues.selectorSettings.session;
      }
      if (
        otherState.permissions.canEditSelectorSettingType &&
        otherFormValues.selectorSettings.setting !== undefined &&
        settings.selectorSettingType !== otherFormValues.selectorSettings.setting
      ) {
        payload.selectorSettingType = otherFormValues.selectorSettings.setting;
      }
    }

    if (
      this.#transportConfigurationFeatureEnabled &&
      otherState.permissions.canEditTransportConfiguration &&
      otherState.hasFields.transportConfiguration
    ) {
      const formConfig = otherFormValues.transportConfiguration;
      const currentConfig = settings.transportConfiguration;
      const isComplete = isTransportConfigurationFormComplete(formConfig);
      const isTransportConfigurationEnabled = formConfig.enabled && isComplete;

      if (currentConfig || isTransportConfigurationEnabled) {
        const newTransportConfig: TransportConfiguration = {
          externalEventId: isTransportConfigurationEnabled ? formConfig.externalEventId.trim() : null,
          isEnabled: isTransportConfigurationEnabled,
          transportProviderId: isTransportConfigurationEnabled ? formConfig.transportProviderId : null,
        };
        const hasChanged =
          currentConfig?.isEnabled !== newTransportConfig.isEnabled ||
          currentConfig?.transportProviderId !== newTransportConfig.transportProviderId ||
          currentConfig?.externalEventId !== newTransportConfig.externalEventId;

        if (hasChanged) {
          payload.transportConfiguration = newTransportConfig;
        }
      }
    }

    return payload;
  }

  #buildTicketSettingsPayload(
    ticketFormValues: Partial<Pick<TicketSettingsFormValue, 'allowInvitationReselling' | 'resellingProvider'>>,
  ): Partial<MainPlanSettings> {
    const settings = this.settings();
    if (!settings) {
      return {};
    }

    const ticketState = this.ticketSettingsState();
    const payload: Partial<MainPlanSettings> = {};

    if (ticketState.permissions.canEditResellingProviders && ticketFormValues.resellingProvider !== undefined) {
      const previousProvider = settings.resellingProviders?.[0];
      const newProvider = ticketFormValues.resellingProvider;
      if (previousProvider !== newProvider) {
        payload.resellingProviders = newProvider != null ? [newProvider] : [];
      }
    }

    if (ticketState.permissions.canEditAllowInvitationReselling && ticketFormValues.allowInvitationReselling !== undefined) {
      if (settings.allowInvitationReselling !== ticketFormValues.allowInvitationReselling) {
        payload.allowInvitationReselling = ticketFormValues.allowInvitationReselling;
      }
    }

    return payload;
  }

  #configureFromAllowToDenyModal(modal: NgbModalRef): void {
    modal.componentInstance.question = this.#translateService.instant('eventSettings.allowPublishingInOta.modalQuestionWhenDisabling');
    modal.componentInstance.explanation = this.#translateService.instant(
      'eventSettings.allowPublishingInOta.modalExplanationWhenDisabling',
    );
    modal.componentInstance.cancelButtonLabel = this.#translateService.instant(
      'eventSettings.allowPublishingInOta.modalCancelButtonWhenDisabling',
    );
    modal.componentInstance.acceptButtonLabel = this.#translateService.instant(
      'eventSettings.allowPublishingInOta.modalAcceptButtonWhenDisabling',
    );
    modal.componentInstance.acceptFirst = false;
    modal.componentInstance.responseEmitter.subscribe((response: boolean) => {
      if (response) {
        this.#revertAllowPublishingInOtaValue();
      }
    });
  }

  #configureFromDenyToAllowModal(modal: NgbModalRef): void {
    modal.componentInstance.question = this.#translateService.instant('eventSettings.allowPublishingInOta.modalQuestionWhenEnabling');
    modal.componentInstance.explanation = this.#translateService.instant('eventSettings.allowPublishingInOta.modalExplanationWhenEnabling');
    modal.componentInstance.cancelButtonLabel = this.#translateService.instant(
      'eventSettings.allowPublishingInOta.modalCancelButtonWhenEnabling',
    );
    modal.componentInstance.acceptButtonLabel = this.#translateService.instant(
      'eventSettings.allowPublishingInOta.modalAcceptButtonWhenEnabling',
    );
    modal.componentInstance.acceptFirst = true;
    modal.componentInstance.responseEmitter.subscribe((response: boolean) => {
      if (!response) {
        this.#revertAllowPublishingInOtaValue();
      }
    });
  }

  #createRedirectSettings(partnerId: number, redirectToId: number): Observable<void> {
    const redirectData: MainPlanRedirect = {
      redirectFromId: this.planId(),
      redirectToId: redirectToId,
    };

    return this.#mainPlanRedirectService.saveMainPlanRedirect(partnerId, redirectData).pipe(
      tap(() => {
        this.mainPlanRedirect = redirectData;
      }),
    );
  }

  #deleteRedirectSettings(partnerId: number): Observable<void> {
    if (!this.mainPlanRedirect) {
      return of(void 0);
    }

    return this.#mainPlanRedirectService.deleteMainPlanRedirect(partnerId, this.planId()).pipe(
      tap(() => {
        this.mainPlanRedirect = null;
      }),
    );
  }

  #fetchTicketDeliverySettings(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return;
    }

    this.#ticketDeliverySettingsService
      .getSettings(partner.id, [this.planId()])
      .pipe(
        tap(rules => {
          const rule = rules[0] ?? null;
          this.ticketDeliveryRule.set(rule);
          if (rule) {
            patchDelayedTicketReleaseFromRule(this.ticketSettingsForm.controls.delayedTicketRelease, rule, this.fallbackTimezone());
            syncDelayedTicketReleaseValidators(
              this.ticketSettingsForm.controls.delayedTicketRelease,
              rule,
              this.fallbackTimezone(),
              this.fallbackFirstActiveTimeSlot(),
            );
          }
          this.ticketSettingsForm.controls.delayedTicketRelease.markAsPristine();
          this.#rememberPristineValues();
        }),
        catchError(() => {
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #fetchTransportProvidersIfNeeded(): void {
    if (this.#transportProvidersFetched) {
      return;
    }

    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return;
    }

    this.#transportProvidersFetched = true;
    this.#partnerTransportProviderService
      .getPartnerTransportProviders(partner.id)
      .pipe(
        tap(response => {
          if (response.error || !response.data) {
            this.#transportProvidersFetched = false;
            this.#toastService.add({
              autoHide: true,
              message: this.#translateService.instant('eventSettings.transportConfiguration.providerLoadError'),
              sentiment: AlertSentiment.danger,
            });
            return;
          }
          this.transportProviders.set(response.data);
        }),
        catchError(() => {
          this.#transportProvidersFetched = false;
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant('eventSettings.transportConfiguration.providerLoadError'),
            sentiment: AlertSentiment.danger,
          });
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #handleRedirectSettings(partnerId: number, formValues: OtherSettingsFormValue): Observable<void> {
    if (!this.#hasRedirectConfigChanged(formValues)) {
      return of(void 0);
    }

    if (this.mainPlanRedirect && !formValues.redirectEnabled) {
      return this.#deleteRedirectSettings(partnerId);
    }

    if (formValues.redirectEnabled && formValues.redirectToId) {
      if (this.mainPlanRedirect) {
        return this.#updateRedirectSettings(partnerId, formValues.redirectToId);
      }
      return this.#createRedirectSettings(partnerId, formValues.redirectToId);
    }

    return of(void 0);
  }

  #hasRedirectConfigChanged(formValues: OtherSettingsFormValue): boolean {
    if (!!this.mainPlanRedirect !== formValues.redirectEnabled) {
      return true;
    }

    if (formValues.redirectEnabled && this.mainPlanRedirect && this.mainPlanRedirect.redirectToId !== formValues.redirectToId) {
      return true;
    }

    return false;
  }

  #initializeFromFilters(planId: number): void {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return;
    }

    this.#searchFiltersService
      .getFilters()
      .pipe(
        catchError(() => {
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((filters: SearchFilter | null) => {
        if (filters?.selectedPlan) {
          if (this.mode() === 'edit') {
            this.isPlanDraft.set(filters.selectedPlan.status === PlanStatus.DRAFT);
          }
          this.planName = filters.selectedPlan.title || '';
          this.fallbackFirstActiveTimeSlot.set(filters.selectedPlan.nextSessionDateRegardlessOfAttendance ?? null);
        }
        if (filters?.timezone) {
          this.fallbackTimezone.set(filters.timezone);
        }
        this.loadAllowedTypesFromSettings(this.settings());
        this.#loadOptions(partner.id, planId);
      });
  }

  #loadBundleDiscountApplicationMode(): void {
    if (this.mode() !== 'edit') {
      return;
    }

    const bundleDiscountApplicationModeControl = this.otherSettingsForm.get('bundleDiscountApplicationMode') as FormControl<boolean> | null;

    this.#bundleDiscountApplicationModeSettingsFacade
      .loadBundleDiscountApplicationMode(this.planId(), bundleDiscountApplicationModeControl)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((isVisible: boolean) => this.bundleDiscountApplicationModeVisible.set(isVisible));
  }

  #loadDeclarativeInventory(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return;
    }

    this.#declarativeInventorySettingsFacade
      .loadDeclarativeInventory(partner.id, this.planId(), this.#getDeclarativeInventoryControl())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#rememberPristineValues());
  }

  #loadOptions(partnerId: number, planId: number): void {
    this.#searchBarService
      .getSearchBarOptions(partnerId)
      .pipe(
        tap((response: SearchBarResponse) => {
          if (response.data) {
            this.cities.set(response.data.cities);
            this.plans.set(response.data.plans.filter((plan: PlanOption) => plan.id !== planId));

            if (this.mainPlanRedirect?.redirectToId) {
              this.#setRedirectSelectedPlan(this.mainPlanRedirect.redirectToId);
            }
          }
        }),
        catchError(() => {
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #patchFormValues(settings: Partial<MainPlanSettings>): void {
    if (settings.type !== undefined || settings.category !== undefined || settings.cities !== undefined) {
      const generalSettingsControl = this.mainSettingsForm.get('generalSettingsSection');
      if (generalSettingsControl) {
        const currentValue = generalSettingsControl.value || {};
        generalSettingsControl.setValue(
          {
            ...currentValue,
            category: settings.category !== undefined ? settings.category : currentValue.category,
            cities: settings.cities !== undefined ? settings.cities : (currentValue.cities ?? []),
            type: settings.type !== undefined ? settings.type : currentValue.type,
          },
          { emitEvent: false },
        );
      }
    }

    if (settings.partnershipType !== undefined || settings.contracts !== undefined) {
      const contractSectionControl = this.mainSettingsForm.get('contractSection');
      if (contractSectionControl) {
        const currentValue = contractSectionControl.value || {};
        contractSectionControl.setValue(
          {
            ...currentValue,
            contracts: settings.contracts !== undefined ? settings.contracts : (currentValue.contracts ?? []),
            partnershipType: settings.partnershipType !== undefined ? settings.partnershipType : currentValue.partnershipType,
          },
          { emitEvent: false },
        );
      }
    }

    if (settings.type !== undefined) {
      this.planType.set(settings.type);
    }

    if (settings.validationMethod !== undefined && settings.validationMethod !== null) {
      const validationSectionControl = this.mainSettingsForm.get('validationSection');
      if (validationSectionControl) {
        const currentValue = validationSectionControl.value || {};
        validationSectionControl.setValue(
          {
            ...currentValue,
            validationMethod: settings.validationMethod,
            validationWindow: settings.validationWindow ?? currentValue.validationWindow ?? ValidationWindow.STANDARD_TIME,
          },
          { emitEvent: false },
        );
      }
    }

    if (settings.mustUseTaxBase !== undefined || settings.hasPriceListPricing !== undefined) {
      const pricesSectionControl = this.mainSettingsForm.get('pricesSection');
      if (pricesSectionControl) {
        const currentValue = pricesSectionControl.value || {};
        pricesSectionControl.setValue(
          {
            ...currentValue,
            priceList: settings.hasPriceListPricing !== undefined ? settings.hasPriceListPricing : (currentValue.priceList ?? false),
            taxCalculation: settings.mustUseTaxBase !== undefined ? settings.mustUseTaxBase : (currentValue.taxCalculation ?? false),
          },
          { emitEvent: false },
        );
      }
    }

    this.#patchOptionalSettingsFormValues(settings);
    this.#patchTicketSettingsFormValues(settings);
  }

  #patchOptionalSettingsFormValues(settings: Partial<MainPlanSettings>): void {
    if (
      settings.calendarSelector !== undefined ||
      settings.continuousTimeSelector !== undefined ||
      settings.labelFormat !== undefined ||
      settings.sessionSelectorType !== undefined ||
      settings.selectorSettingType !== undefined
    ) {
      const selectorSettingsControl = this.otherSettingsForm.get('selectorSettings');
      if (selectorSettingsControl) {
        const currentValue = selectorSettingsControl.value || {};
        selectorSettingsControl.setValue(
          {
            ...currentValue,
            calendar: settings.calendarSelector !== undefined ? settings.calendarSelector : (currentValue.calendar ?? false),
            continuousTime:
              settings.continuousTimeSelector !== undefined ? settings.continuousTimeSelector : (currentValue.continuousTime ?? false),
            labelFormat: settings.labelFormat !== undefined ? settings.labelFormat : (currentValue.labelFormat ?? ''),
            session:
              settings.sessionSelectorType !== undefined
                ? settings.sessionSelectorType
                : (currentValue.session ?? SessionSelectorType.DateTime),
            setting:
              settings.selectorSettingType !== undefined
                ? settings.selectorSettingType
                : (currentValue.setting ?? SelectorSettingType.SingleVertical),
          },
          { emitEvent: false },
        );
      }
    }

    if (settings.requestGeneralReview !== undefined) {
      const postPurchaseReviewControl = this.otherSettingsForm.get('postPurchaseReview');
      if (postPurchaseReviewControl) {
        postPurchaseReviewControl.setValue(settings.requestGeneralReview, { emitEvent: false });
      }
    }

    if (settings.disallowIndexing !== undefined) {
      const disallowIndexingControl = this.otherSettingsForm.get('disallowIndexing');
      if (disallowIndexingControl) {
        disallowIndexingControl.setValue(settings.disallowIndexing, { emitEvent: false });
      }
    }

    if (settings.allowTicketCancellations !== undefined) {
      this.otherSettingsForm.get('allowTicketCancellations')?.setValue(settings.allowTicketCancellations);
      this.otherSettingsForm
        .get('hoursBeforeSessionCancellationNotAllowed')
        ?.setValue(settings.hoursBeforeSessionCancellationNotAllowed ?? null);
    }

    if (settings.overrideCapacityLimit !== undefined) {
      const overrideCapacityEnabledControl = this.otherSettingsForm.get('overrideCapacityEnabled');
      const overrideCapacityLimitControl = this.otherSettingsForm.get('overrideCapacityLimit');
      if (overrideCapacityEnabledControl) {
        overrideCapacityEnabledControl.setValue(settings.overrideCapacityLimit != null);
      }
      if (overrideCapacityLimitControl) {
        overrideCapacityLimitControl.setValue(settings.overrideCapacityLimit, { emitEvent: false });
      }
    }

    if (settings.denyPublishingInOta !== undefined) {
      const allowPublishingInOtaControl = this.otherSettingsForm.get('allowPublishingInOta');
      if (allowPublishingInOtaControl) {
        allowPublishingInOtaControl.setValue(!settings.denyPublishingInOta);
      }
    }

    if (settings.redirectToId !== undefined) {
      this.#processRedirectSettingsData(settings.redirectToId);
    }

    if (settings.transportConfiguration !== undefined && this.#transportConfigurationFeatureEnabled) {
      this.#patchTransportConfigurationForm(settings.transportConfiguration);
    }
  }

  #patchTicketSettingsFormValues(settings: Partial<MainPlanSettings>): void {
    if (settings.resellingProviders !== undefined) {
      const providers = Array.isArray(settings.resellingProviders) ? [...settings.resellingProviders] : [];
      const control = this.ticketSettingsForm.get('resellingProvider');
      if (control) {
        control.setValue(providers.length > 0 ? providers[0] : null);
      }
    }

    if (settings.allowInvitationReselling !== undefined) {
      const control = this.ticketSettingsForm.get('allowInvitationReselling');
      if (control) {
        control.setValue(settings.allowInvitationReselling, { emitEvent: false });
      }
    }
  }

  #patchTransportConfigurationForm(config: TransportConfiguration): void {
    const transportGroup = this.otherSettingsForm.get('transportConfiguration') as TransportConfigurationFormGroup | null;
    if (!transportGroup) {
      return;
    }

    transportGroup.patchValue(
      {
        enabled: config.isEnabled,
        externalEventId: config.externalEventId ?? '',
        transportProviderId: config.transportProviderId,
      },
      { emitEvent: false },
    );

    if (config.isEnabled) {
      this.#fetchTransportProvidersIfNeeded();
    }
  }

  #processRedirectSettingsData(redirectToId: number | null | undefined): void {
    if (redirectToId != null) {
      this.mainPlanRedirect = {
        redirectFromId: this.planId(),
        redirectToId: redirectToId,
      };
      this.otherSettingsForm.patchValue({
        redirectEnabled: true,
        redirectToId: redirectToId,
      });
    } else {
      this.mainPlanRedirect = null;
      this.otherSettingsForm.patchValue({
        redirectEnabled: false,
        redirectToId: null,
      });
      this.redirectSelectedPlan.set(null);
      this.redirectSelectedCity.set(null);
    }
  }

  #revertAllowPublishingInOtaValue(): void {
    const currentValue = this.otherSettingsForm.get('allowPublishingInOta')?.value;
    this.otherSettingsForm.patchValue({ allowPublishingInOta: !currentValue });
  }

  #saveMainSettingsEditMode(partnerId: number, mainFormValues: MainSettingsFormValue): Observable<void> {
    const payload = this.#buildMainSettingsPayload(mainFormValues);

    if (Object.keys(payload).length === 0) {
      return of(void 0);
    }

    return this.#mainPlanSettingsService.updateMainPlanGeneralSettings(partnerId, this.planId(), payload).pipe(
      tap(() => {
        const settings = this.settings();
        if (settings) {
          Object.assign(settings, payload);
        }
      }),
    );
  }

  #saveOtherSettingsEditMode(
    partnerId: number,
    otherFormValues: OtherSettingsFormValue,
    cancellationSettings: CancellationSettingsPayload,
  ): Observable<void> {
    const payload = this.#buildOtherSettingsPayload(otherFormValues, cancellationSettings);

    if (Object.keys(payload).length === 0) {
      return of(void 0);
    }

    return this.#mainPlanSettingsService.updateMainPlanGeneralSettings(partnerId, this.planId(), payload).pipe(
      tap(() => {
        const settings = this.settings();
        if (settings) {
          Object.assign(settings, payload);
        }
      }),
    );
  }

  #saveSettings(options: { navigateOnSuccess: boolean; successMessageKey: string }): void {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      this.#toastService.add({
        autoHide: true,
        message: this.#translateService.instant('planSettings.errors.partnerNotFound'),
        sentiment: AlertSentiment.danger,
      });
      return;
    }

    if (
      !this.mainSettingsForm.valid ||
      !isFormValidIgnoringUneditableCancellationControls(this.otherSettingsForm, this.cancellationSettingsSectionConfig()) ||
      !this.ticketSettingsForm.valid
    ) {
      this.#waitingRoomValidationDisplayService.enableValidationErrors();
      this.mainSettingsForm.markAllAsTouched();
      this.otherSettingsForm.markAllAsTouched();
      this.ticketSettingsForm.markAllAsTouched();
      this.#toastService.add({
        autoHide: true,
        message: this.#translateService.instant('planSettings.errors.requiredFields'),
        sentiment: AlertSentiment.danger,
      });
      return;
    }

    this.#waitingRoomValidationDisplayService.disableValidationErrors();
    this.isSaving.set(true);

    if (this.mode() === 'edit') {
      this.#saveSettingsEditMode(partner.id, options);
    } else {
      this.#saveSettingsCreationMode(partner.id, options);
    }
  }

  #saveSettingsCreationMode(partnerId: number, options: { navigateOnSuccess: boolean; successMessageKey: string }): void {
    const mainFormValues = this.mainSettingsForm.value;
    const otherFormValues = this.otherSettingsForm.value;
    const ticketFormValues = this.ticketSettingsForm.value;
    const payload = {
      ...this.#buildMainSettingsPayload(mainFormValues),
      ...this.#buildOtherSettingsPayload(otherFormValues),
      ...this.#buildTicketSettingsPayload(ticketFormValues),
    };

    const observables: Observable<void>[] = [];

    if (Object.keys(payload).length > 0) {
      observables.push(this.#mainPlanSettingsService.updateMainPlanGeneralSettings(partnerId, this.planId(), payload));
    }
    observables.push(this.#handleRedirectSettings(partnerId, otherFormValues));
    observables.push(this.#syncWaitingRoomIfDirty(partnerId, this.planId()));
    observables.push(this.#syncTicketReleaseIfDirty(partnerId));
    observables.push(this.#syncDeclarativeInventoryIfDirty(partnerId));

    forkJoin(observables.length > 0 ? observables : [of(void 0)])
      .pipe(
        tap(() => {
          this.isSaving.set(false);
          this.mainSettingsForm.markAsPristine();
          this.otherSettingsForm.markAsPristine();
          this.ticketSettingsForm.markAsPristine();
          this.#rememberPristineValues();
          this.onFormDirtyChange()?.(this.#customFieldsDirty());
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant(options.successMessageKey),
            sentiment: AlertSentiment.positive,
          });

          if (options.navigateOnSuccess && this.showCustomFieldsTab()) {
            this.setActiveTab('customFields');
          } else if (options.navigateOnSuccess) {
            this.#router.navigate(['/plans/dashboard'], { queryParams: { planId: this.planId() } });
          }
        }),
        catchError((error: unknown) => {
          this.isSaving.set(false);
          this.#emitDirtyState();
          const httpError = error as HttpErrorResponse;
          const httpStatus = httpError?.error?.status ?? httpError?.status;
          const errorMessage =
            httpStatus === 422
              ? this.#translateService.instant('eventSettings.mainPlanNotValidError')
              : this.#translateService.instant('planSettings.errors.saveFailed');
          this.#toastService.add({
            autoHide: true,
            message: errorMessage,
            sentiment: AlertSentiment.danger,
          });
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #saveSettingsEditMode(partnerId: number, options: { navigateOnSuccess: boolean; successMessageKey: string }): void {
    const isMainDirty = this.mainSettingsForm.dirty;
    const isOtherDirty = this.otherSettingsForm.dirty;
    const isTicketDirty = this.ticketSettingsForm.dirty;
    const mainFormValues = this.mainSettingsForm.value;
    const otherFormValues = this.otherSettingsForm.value;
    const ticketFormValues = this.ticketSettingsForm.value;

    const cancellationSettings: CancellationSettingsPayload = isOtherDirty ? this.#buildCancellationSettingsPayload(otherFormValues) : {};
    const observables: Observable<void>[] = [];

    if (isMainDirty) {
      observables.push(this.#saveMainSettingsEditMode(partnerId, mainFormValues));
    }

    if (isOtherDirty) {
      observables.push(this.#handleRedirectSettings(partnerId, otherFormValues));
      observables.push(this.#saveOtherSettingsEditMode(partnerId, otherFormValues, cancellationSettings));
      observables.push(this.#syncWaitingRoomIfDirty(partnerId, this.planId()));
      observables.push(this.#syncBundleDiscountApplicationModeIfDirty(this.planId()));
      observables.push(this.#syncDeclarativeInventoryIfDirty(partnerId));
    }

    if (isTicketDirty) {
      observables.push(this.#saveTicketSettingsEditMode(partnerId, ticketFormValues));
      observables.push(this.#syncTicketReleaseIfDirty(partnerId));
    }

    forkJoin(observables.length > 0 ? observables : [of(void 0)])
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.isSaving.set(false);
          this.#emitDirtyState();
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant('eventSettings.errorMessage'),
            sentiment: AlertSentiment.danger,
          });
        },
        next: () => {
          this.isSaving.set(false);
          this.mainSettingsForm.markAsPristine();
          this.otherSettingsForm.markAsPristine();
          this.ticketSettingsForm.markAsPristine();
          this.#rememberPristineValues();
          this.onFormDirtyChange()?.(this.#customFieldsDirty());
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant(options.successMessageKey),
            sentiment: AlertSentiment.positive,
          });
          this.#trackEventSettingsSaved(mainFormValues, otherFormValues, cancellationSettings);
        },
      });
  }

  #saveTicketSettingsEditMode(
    partnerId: number,
    ticketFormValues: Partial<Pick<TicketSettingsFormValue, 'allowInvitationReselling' | 'resellingProvider'>>,
  ): Observable<void> {
    const payload = this.#buildTicketSettingsPayload(ticketFormValues);

    if (Object.keys(payload).length === 0) {
      return of(void 0);
    }

    return this.#mainPlanSettingsService.updateMainPlanGeneralSettings(partnerId, this.planId(), payload).pipe(
      tap(() => {
        const settings = this.settings();
        if (settings) {
          Object.assign(settings, payload);
        }
      }),
    );
  }

  #setActiveTabAndScroll(tab: SettingsTab['id']): void {
    this.activeTab.set(tab);
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }

  #setPermissionsFromSettings(settings: Partial<MainPlanSettings>): void {
    this.mainSettingsState.set(buildMainSettingsStateFromSettings(settings));
    this.otherSettingsState.set(buildOtherSettingsStateFromSettings(settings));
    this.ticketSettingsState.set(buildTicketSettingsStateFromSettings(settings));
  }

  #setRedirectSelectedCity(planOption: PlanOption): void {
    if (planOption.places && planOption.places.length > 0) {
      const firstPlace = planOption.places[0];
      this.redirectSelectedCity.set(this.cities().find(city => city.id === firstPlace.cityId) ?? null);
    }
  }

  #setRedirectSelectedPlan(redirectToId: number): void {
    const selectedPlanOption = this.plans().find(plan => plan.id === redirectToId);

    if (selectedPlanOption) {
      this.redirectSelectedPlan.set(selectedPlanOption);
      this.#setRedirectSelectedCity(selectedPlanOption);
    } else {
      this.redirectSelectedPlan.set(null);
      this.redirectSelectedCity.set(null);
    }
  }

  #emitDirtyState(): void {
    const isDirty =
      this.mainSettingsForm.dirty ||
      this.otherSettingsForm.dirty ||
      this.ticketSettingsForm.dirty ||
      this.#agreementsDirty() ||
      this.#customFieldsDirty();
    this.onFormDirtyChange()?.(isDirty);
  }

  #subscribeToFormDirtyState(): void {
    if (!this.onFormDirtyChange()) {
      return;
    }
    merge(this.mainSettingsForm.valueChanges, this.otherSettingsForm.valueChanges, this.ticketSettingsForm.valueChanges)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#emitDirtyState());
  }

  #subscribeToGeneralSettingsChanges(): void {
    const generalSettingsControl = this.mainSettingsForm.get('generalSettingsSection');
    if (generalSettingsControl) {
      generalSettingsControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => {
        if (value?.type !== undefined) {
          this.planType.set(value.type as PlanType);
        }
      });
    }
  }

  #subscribeToOptimizelyFeatureRefresh(): void {
    merge(this.#optimizelyService.observeUserData(), this.#optimizelyService.observePlanData())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#optimizelyFeatureUiRevision.update(version => version + 1);
      });
  }

  #syncBundleDiscountApplicationModeIfDirty(planId: number): Observable<void> {
    const bundleDiscountApplicationModeControl = this.otherSettingsForm.get('bundleDiscountApplicationMode') as FormControl<boolean> | null;

    return this.#bundleDiscountApplicationModeSettingsFacade.syncBundleDiscountApplicationModeIfDirty(
      planId,
      bundleDiscountApplicationModeControl,
    );
  }

  #syncDeclarativeInventoryIfDirty(partnerId: number): Observable<void> {
    return this.#declarativeInventorySettingsFacade.syncDeclarativeInventoryIfDirty(
      partnerId,
      this.planId(),
      this.#getDeclarativeInventoryControl(),
    );
  }

  #syncTicketReleaseIfDirty(partnerId: number): Observable<void> {
    return this.#ticketReleaseSettingsFacade.syncTicketReleaseIfDirty(
      partnerId,
      this.planId(),
      this.ticketSettingsForm.controls.delayedTicketRelease,
      this.ticketDeliveryRule(),
      this.fallbackTimezone(),
      this.fallbackFirstActiveTimeSlot(),
      rule => this.ticketDeliveryRule.set(rule),
    );
  }

  #syncWaitingRoomIfDirty(partnerId: number, planId: number): Observable<void> {
    const waitingRoomControl = this.otherSettingsForm.get(waitingRoomFormControlName) as WaitingRoomFormGroup | null;

    return this.#waitingRoomSettingsFacade.syncWaitingRoomIfDirty(partnerId, planId, waitingRoomControl);
  }

  #trackEventSettingsSaved(
    mainFormValues: MainSettingsFormValue,
    otherFormValues: OtherSettingsFormValue,
    cancellationSettings: CancellationSettingsPayload,
  ): void {
    const otherState = this.otherSettingsState();
    this.#fzTracking.track(
      saveMainPlanSettings({
        context: resolvePlanSaveContext(this.mode()),
        planId: this.planId(),
        planName: this.planName,
        ...(mainFormValues.generalSettingsSection?.cities && {
          cities: mainFormValues.generalSettingsSection.cities,
        }),
        ...(mainFormValues.validationSection?.validationMethod && {
          validationMethod: String(mainFormValues.validationSection.validationMethod),
        }),
        ...(mainFormValues.validationSection?.validationWindow && {
          validationWindow: String(mainFormValues.validationSection.validationWindow),
        }),
        ...(mainFormValues.pricesSection?.taxCalculation !== undefined && {
          mustUseTaxBase: mainFormValues.pricesSection.taxCalculation,
        }),
        ...(mainFormValues.pricesSection?.priceList !== undefined && {
          hasPriceListPricing: mainFormValues.pricesSection.priceList,
        }),
        ...(otherFormValues.selectorSettings?.calendar !== undefined && {
          calendarSelector: otherFormValues.selectorSettings.calendar,
        }),
        ...(otherFormValues.selectorSettings?.continuousTime !== undefined && {
          continuousTimeSelector: otherFormValues.selectorSettings.continuousTime,
        }),
        ...(otherFormValues.selectorSettings?.session && {
          sessionSelectorType: String(otherFormValues.selectorSettings.session),
        }),
        ...(otherFormValues.selectorSettings?.setting && {
          selectorSettingType: String(otherFormValues.selectorSettings.setting),
        }),
        ...(shouldShowExternalPlatformsForPlanType(this.planType()) &&
          otherFormValues.allowPublishingInOta !== undefined && {
            denyPublishingInOta: !otherFormValues.allowPublishingInOta,
          }),
        ...(otherFormValues.postPurchaseReview && {
          requestGeneralReview: String(otherFormValues.postPurchaseReview),
        }),
        ...(otherFormValues.disallowIndexing !== undefined && {
          disallowIndexing: otherFormValues.disallowIndexing,
        }),
        ...(otherFormValues.overrideCapacityEnabled !== undefined && {
          overrideCapacityLimit: otherFormValues.overrideCapacityEnabled
            ? coercePositiveIntegerOrNull(otherFormValues.overrideCapacityLimit)
            : null,
        }),
        ...(otherState.hasFields.transportConfiguration &&
          this.#transportConfigurationFeatureEnabled && {
            transportEnabled: otherFormValues.transportConfiguration.enabled,
            transportExternalEventId: otherFormValues.transportConfiguration.externalEventId || null,
            transportProviderId: otherFormValues.transportConfiguration.transportProviderId,
          }),
        ...cancellationSettings,
      }),
    );
  }

  #updateRedirectSettings(partnerId: number, redirectToId: number): Observable<void> {
    const redirectData: MainPlanRedirect = {
      redirectFromId: this.planId(),
      redirectToId: redirectToId,
    };

    return this.#mainPlanRedirectService.updateMainPlanRedirect(partnerId, redirectData).pipe(
      tap(() => {
        this.mainPlanRedirect = redirectData;
      }),
    );
  }
}
