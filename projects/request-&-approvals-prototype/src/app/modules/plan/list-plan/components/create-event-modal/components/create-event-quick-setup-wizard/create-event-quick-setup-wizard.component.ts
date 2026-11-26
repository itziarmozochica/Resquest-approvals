import { CdkScrollable } from '@angular/cdk/scrolling';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  EnvironmentInjector,
  inject,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import {
  GalleryImageCropModalComponent,
  GalleryImageCropModalData,
} from '@fz-original/app/modules/content-plan/components/plan-edition/plan-gallery-edition/gallery-image-crop-modal/gallery-image-crop-modal.component';
import { validateImagePreCrop } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-gallery-edition/utils/gallery-image-crop.util';
import { GALLERY_IMAGE_MAX_SIZE_BYTES } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-gallery-edition/utils/gallery-image-upload.constants';
import { PlanGallery } from '@fz-original/app/modules/content-plan/models/get-gallery';
import { GooglePlacesService } from '@fz-original/app/modules/content-plan/services/google-places/google-places.service';
import { PlanGalleryService } from '@fz-original/app/modules/content-plan/services/plan-gallery/plan-gallery.service';
import { openConfirmModalWithLabels } from '@fz-original/app/modules/content-plan/utils/open-confirm-modal-with-labels.util';
import { MainPlanSettingsService } from '@fz-original/app/modules/event-settings/services/main-plan-settings.service';
import { CapacityTemplateService } from '@fz-original/app/modules/inventory/inventory-capacity/services/capacity-template.service';
import { PriceMatrixService } from '@fz-original/app/modules/inventory/inventory-pricing/shared/services/price-matrix/price-matrix.service';
import {
  CalendarDateFrequency,
  CalendarTimeSlotFrequency,
  ScheduleCalendar,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import { InventoryProvisioningService } from '@fz-original/app/modules/plan/services/inventory-provisioning.service';
import { createEvent } from '@fz-original/app/modules/plan/tracking/events/create-event.event';
import { planCreationAbandoned } from '@fz-original/app/modules/plan/tracking/events/plan-creation-abandoned.event';
import { quickSetupContentSaved } from '@fz-original/app/modules/plan/tracking/events/quick-setup-content-saved.event';
import { quickSetupInventorySaved } from '@fz-original/app/modules/plan/tracking/events/quick-setup-inventory-saved.event';
import { quickSetupPreviewConfirmed } from '@fz-original/app/modules/plan/tracking/events/quick-setup-preview-confirmed.event';
import { quickSetupPreviewReturnToSchedule } from '@fz-original/app/modules/plan/tracking/events/quick-setup-preview-return-to-schedule.event';
import { quickSetupScheduleContinue } from '@fz-original/app/modules/plan/tracking/events/quick-setup-schedule-continue.event';
import { PlanCreationAbandonStep, QuickSetupTrackingContext } from '@fz-original/app/modules/plan/tracking/models/plan-tracking.model';
import { planTrackingProvider } from '@fz-original/app/modules/plan/tracking/plan.tracking-provider';
import { CreateVenueFormComponent } from '@fz-original/app/modules/venues/components/create-venue-form/create-venue-form.component';
import { ImageSortableListComponent } from '@fz-original/app/shared/components/image-sortable-list/image-sortable-list.component';
import { RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { MediaListItem } from '@fz-original/app/shared/models/media/media.model';
import { PlanDetail, Venue, VenueDTO } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { PlanKind } from '@fz-original/app/shared/models/plan/plan-kind.enum';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { SearchBarService } from '@fz-original/app/shared/search-bar/service/search-bar.service';
import { SentryLoggerService } from '@fz-original/app/shared/services/error-logger/sentry-logger.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { CreateMainPlanMediaItem } from '@fz-original/app/shared/services/plan/create-main-plan.service';
import { PlanDetailService } from '@fz-original/app/shared/services/plan/plan-detail.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { SessionTypeInventory } from '@fz-original/app/shared/services/sessions/session-type.model';
import { SessionTypeService } from '@fz-original/app/shared/services/sessions/session-type.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import {
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_REF,
  IgntAlertComponent,
  IgntButtonComponent,
  IgntDialogModule,
  IgntDialogService,
  IgntProgressStepperComponent,
  type IgntDialogRef,
  type IgntProgressStepperItem,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntRichTextEditorComponent } from '@ignite/rich-text-editor';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, merge, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, finalize, map, mergeMap, startWith, switchMap, take, takeUntil, tap } from 'rxjs/operators';

import { contentCategoryIds } from '../../models/content-questions-catalog/content-questions-catalog.ids';
import { ContentQuestionsCatalogService } from '../../models/content-questions-catalog/content-questions-catalog.service';
import { ContentCategoryId, ContentQuestionsValue } from '../../models/content-questions.model';
import {
  CREATE_EVENT_GALLERY_UPLOAD_ERROR_I18N_KEYS,
  CreateEventGalleryUploadErrorReason,
} from '../../models/create-event-gallery-upload.model';
import { quickSetupCategoryIds } from '../../models/quick-setup-category.model';
import { QuickSetupPlanCategoryId } from '../../models/quick-setup-form.model';
import {
  QuickSetupInventoryAssignedIds,
  QuickSetupInventoryPayload,
  QuickSetupInventoryPrefill,
} from '../../models/quick-setup-inventory.model';
import { QuickSetupPreviewData, QuickSetupPreviewInventorySource } from '../../models/quick-setup-preview.model';
import { QUICK_SETUP_DEFAULT_TIMEZONE } from '../../models/quick-setup-schedule.model';
import { CreateEventGalleryUploadService } from '../../services/create-event-gallery-upload.service';
import { CreateEventQuickSetupFeedbackService } from '../../services/create-event-quick-setup-feedback.service';
import { CreateEventQuickSetupInventoryService } from '../../services/create-event-quick-setup-inventory.service';
import { CreateEventQuickSetupScheduleService } from '../../services/create-event-quick-setup-schedule.service';
import { CreateEventQuickSetupService } from '../../services/create-event-quick-setup.service';
import { QuickSetupWriteOriginService } from '../../services/quick-setup-write-origin.service';
import { applyQuickSetupInventoryAssignedIds } from '../../utils/apply-quick-setup-inventory-assigned-ids.util';
import { mapQuickSetupGalleryMedia } from '../../utils/map-quick-setup-gallery-media.util';
import { createQuickSetupGalleryMediaValidator } from '../../utils/quick-setup-gallery-media-validator.util';
import { buildQuickSetupTrackingContext } from '../../utils/quick-setup-tracking-context.util';
import { requiredRichText } from '../../utils/required-rich-text-validator.util';
import { VenueSelectComponent } from '../venue-select/venue-select.component';
import { ContentQuestionsComponent } from './components/content-questions/content-questions.component';
import {
  contentQuestionsTranslationPrefix,
  prependVerticalToContentQuestionsDescription,
} from './components/content-questions/content-questions.util';
import { QuickSetupCategorySelectorComponent } from './components/quick-setup-category-selector/quick-setup-category-selector.component';
import { QuickSetupInventoryStepComponent } from './components/quick-setup-inventory-step/quick-setup-inventory-step.component';
import { QuickSetupPreviewStepComponent } from './components/quick-setup-preview-step/quick-setup-preview-step.component';
import {
  applyPlanCurrencyToPreviewData,
  buildQuickSetupPreviewData,
  resolvePlanLanguageLabel,
  resolveQuickSetupPreviewCoverUrl,
  resolveValidationMethodLabel,
} from './components/quick-setup-preview-step/utils/quick-setup-preview.util';
import { QuickSetupScheduleStepComponent } from './components/quick-setup-schedule-step/quick-setup-schedule-step.component';
import {
  CreateEventQuickSetupWizardCloseResult,
  CreateEventQuickSetupWizardData,
  CreateEventQuickSetupWizardResult,
  ModalToast,
  QuickSetupInventoryCurrencyState,
} from './create-event-quick-setup-wizard.model';
import { QuickSetupWizardStep } from './quick-setup-wizard-step.enum';
import { mapResumedInventoryToPrefill } from './utils/map-resumed-inventory-to-prefill.util';
import { normalizeResumedVenue } from './utils/normalize-resumed-venue.util';
import { planCurrencyOf } from './utils/plan-currency.util';
import { planTimezoneOf } from './utils/plan-timezone.util';
import { buildQuickSetupDefaultDescriptionHtml } from './utils/quick-setup-default-description.util';

const CONTENT_SAVED_TOAST_ID = 'create-event-quick-setup-content-saved';
const TAX_AREA_LOAD_ERROR_TOAST_ID = 'create-event-quick-setup-tax-area-load-error';
// What `ToastComponent.defaultDelay` was, kept so an auto-hiding wizard toast lasts as long as it used to.
const MODAL_TOAST_AUTO_HIDE_MS = 10_000;
const INVENTORY_SAVED_TOAST_ID = 'create-event-quick-setup-inventory-saved';
const SCHEDULE_SAVED_TOAST_ID = 'create-event-quick-setup-schedule-saved';
const SCHEDULE_DAY_OVERLAP_TOAST_ID = 'create-event-quick-setup-schedule-day-overlap';
const SCHEDULE_OPTIONS_LOAD_ERROR_TOAST_ID = 'create-event-quick-setup-schedule-options-load-error';
const SCHEDULE_SUBMIT_ERROR_TOAST_ID = 'create-event-quick-setup-schedule-submit-error';
const INVENTORY_ALREADY_CONFIGURED_TOAST_ID = 'create-event-quick-setup-inventory-already-configured';
const PREVIOUS_STEP_LOAD_ERROR_TOAST_ID = 'create-event-quick-setup-previous-step-load-error';
const VENUE_CREATE_ERROR_TOAST_ID = 'create-event-quick-setup-venue-create-error';
const VENUE_CREATED_TOAST_ID = 'create-event-quick-setup-venue-created';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // HACK: temporary. Preview reuses the schedule shell width. The mask runs only when that width changes.
  host: {
    '[class.create-event-quick-setup-wizard--resize-masked]': 'hasScheduleStepToggled()',
    '[class.create-event-quick-setup-wizard--schedule-step]': 'isExpandedShellStep()',
  },
  imports: [
    CdkScrollable,
    ContentQuestionsComponent,
    CreateVenueFormComponent,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntDialogModule,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntProgressStepperComponent,
    IgntRichTextEditorComponent,
    ImageSortableListComponent,
    QuickSetupCategorySelectorComponent,
    QuickSetupInventoryStepComponent,
    QuickSetupPreviewStepComponent,
    QuickSetupScheduleStepComponent,
    ReactiveFormsModule,
    TranslateModule,
    VenueSelectComponent,
  ],
  providers: [...planTrackingProvider()],
  selector: 'app-create-event-quick-setup-wizard',
  styleUrl: './create-event-quick-setup-wizard.component.scss',
  templateUrl: './create-event-quick-setup-wizard.component.html',
})
export class CreateEventQuickSetupWizardComponent {
  static readonly titleMaxLength = 65;

  readonly #data = inject<CreateEventQuickSetupWizardData>(IGNT_DIALOG_DATA);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<CreateEventQuickSetupWizardCloseResult | null>;
  readonly #dialogClose = this.#dialogRef.close.bind(this.#dialogRef);
  readonly #capacityTemplateService = inject(CapacityTemplateService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #environmentInjector = inject(EnvironmentInjector);
  readonly #formBuilder = inject(FormBuilder);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #galleryUploadService = inject(CreateEventGalleryUploadService);
  readonly #googlePlacesService = inject(GooglePlacesService);
  readonly #inventoryProvisioningService = inject(InventoryProvisioningService);
  readonly #inventoryService = inject(CreateEventQuickSetupInventoryService);
  readonly #mainPlanSettingsService = inject(MainPlanSettingsService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #planDetailService = inject(PlanDetailService);
  readonly #planGalleryService = inject(PlanGalleryService);
  readonly #planService = inject(PlanService);
  readonly #priceMatrixService = inject(PriceMatrixService);
  readonly #quickSetupFeedbackService = inject(CreateEventQuickSetupFeedbackService);
  readonly #quickSetupScheduleService = inject(CreateEventQuickSetupScheduleService);
  readonly #partnerService = inject(PartnerService);
  readonly #quickSetupService = inject(CreateEventQuickSetupService);
  readonly #router = inject(Router);
  readonly #searchBarService = inject(SearchBarService);
  readonly #sentryLoggerService = inject(SentryLoggerService);
  readonly #sessionTypeService = inject(SessionTypeService);
  readonly #toastService = inject(ToastService);
  readonly #contentQuestionsCatalogService = inject(ContentQuestionsCatalogService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);
  readonly #writeOriginService = inject(QuickSetupWriteOriginService);
  readonly #inventoryCurrencyRead$ = new Subject<Observable<Pick<QuickSetupInventoryCurrencyState, 'currency' | 'hasError'>>>();
  // The places list carries no timezone either: the schedule step runs in the one the backend stored for the plan's venue.
  readonly #planTimezone = signal<string | null>(null);
  readonly #previewPlanDetailCancelled$ = new Subject<void>();
  /** `IgntDialogRef.close()` only disposes the dialog after its leave animation, so the resume load needs its own cancellation. */
  readonly #resumeCancelled$ = new Subject<void>();
  readonly #resumePlanId = this.#data.resumePlanId;
  readonly #isResuming = this.#resumePlanId !== undefined;
  /** A project-management run stays in project management: the dialog closes with the result, nothing navigates. */
  readonly #isProjectManagementSource = this.#data.source === 'project_management';
  readonly #informationRequestIdToLinkOnCreation = this.#isResuming ? undefined : this.#data.informationRequestId;
  /** The cover already stored on a resumed plan, used by the preview until the content step's gallery holds photos. */
  readonly #resumedCoverImageUrl = signal<string | null>(null);
  readonly #resumedVenueToSelect = signal<Venue | null>(null);
  readonly #resumedSessionTypeInventory = signal<SessionTypeInventory | null>(null);
  #resumedShowcasePlaceId: number | null = null;
  #isResumedContentPending = this.#isResuming;

  protected readonly isContentQuestionsEnabled =
    this.#optimizelyService.isFeatureEnabled(FeatureFlags.QUICK_SETUP_CONTENT_QUESTIONS) === true;
  protected readonly isContentQuestionsShown = this.isContentQuestionsEnabled && !this.#isResuming;

  protected readonly isShowcaseVenueEditable = this.#optimizelyService.isFeatureEnabled(FeatureFlags.SHOWCASE_PLAN_VENUE) === true;

  protected readonly canCreateVenue = this.#userService.hasPermission(Permissions.CAN_CREATE_VENUES);
  protected readonly contentQuestions = viewChild(ContentQuestionsComponent);
  /** Set synchronously on a resume so every exit — including one during the initial load — carries the plan id. */
  protected readonly createdPlanId = signal<number | null>(this.#resumePlanId ?? null);
  protected readonly createdPlaceId = signal<number | null>(null);
  protected readonly currentStepIndex = signal(QuickSetupWizardStep.Content);
  protected readonly quickSetupWizardStep = QuickSetupWizardStep;
  protected readonly eventType = this.#data.eventType;
  protected readonly galleryFileTemplateUrl =
    'https://docs.google.com/presentation/d/e/2PACX-1vS9LKEjvuObaY2FDASM7DXvSICK1YoKFD7cB-s_sx9kQlaEwuUuIO2fP09jfdwddFy48MAhZIbqJjoR/pub';
  protected readonly galleryUploadErrorToastId = 'create-event-quick-setup-gallery-upload-error';
  protected readonly galleryUploadHintKey = 'createEvent.quickSetupWizard.step1.galleryUploadHint';
  protected galleryPhotos: MediaListItem[] = [];
  protected readonly isCreatingVenue = signal(false);
  protected readonly isCreatingVenueDirty = signal(false);
  protected readonly isCreatingVenueSaving = signal(false);
  protected readonly isGalleryUploading = signal(false);
  protected readonly inventoryAssignedIds = signal<QuickSetupInventoryAssignedIds | null>(null);
  // A new read starts with no currency, so a venue changed in Content never shows its predecessor's currency.
  protected readonly inventoryCurrency = toSignal(
    this.#inventoryCurrencyRead$.pipe(
      switchMap(currencyRead$ =>
        currencyRead$.pipe(
          map((currencyRead): QuickSetupInventoryCurrencyState => ({ ...currencyRead, isLoading: false })),
          startWith<QuickSetupInventoryCurrencyState>({ currency: null, hasError: false, isLoading: true }),
        ),
      ),
    ),
    { initialValue: { currency: null, hasError: false, isLoading: false } },
  );
  protected readonly inventoryPrefill = signal<QuickSetupInventoryPrefill | null>(null);
  protected readonly scheduleTimezone = computed(() => this.#planTimezone() ?? QUICK_SETUP_DEFAULT_TIMEZONE);
  #isInventoryIdsRefreshPending = false;
  protected readonly inventorySubmitRequest = signal(0);
  protected readonly isInventoryStepValid = signal(false);
  protected readonly isPreviewLoading = signal(false);
  protected readonly isPreviousStepLoading = signal(false);
  /** True from construction until the resumed plan is loaded, so the create step can neither render nor be submitted. */
  protected readonly isResumeLoading = signal(this.#isResuming);
  protected readonly isScheduleStepValid = signal(false);
  protected readonly scheduleReloadRequest = signal(0);
  protected readonly scheduleStep = viewChild(QuickSetupScheduleStepComponent);
  protected readonly isSaving = signal(false);
  protected readonly modalToast = signal<ModalToast | null>(null);
  protected readonly pendingScheduleCalendars = signal<ScheduleCalendar[]>([]);
  protected readonly previewData = signal<QuickSetupPreviewData | null>(null);
  protected readonly previewStep = viewChild(QuickSetupPreviewStepComponent);
  protected readonly partnersSupportEmail = 'partners@example.com';
  protected readonly planContentFeatures = RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES;
  protected readonly savedInventoryPayload = signal<QuickSetupInventoryPayload | null>(null);
  protected readonly selectedVenue = signal<Venue | null>(null);
  protected readonly selectedVenueMapUrl = signal<string | null>(null);
  protected readonly venueSelect = viewChild(VenueSelectComponent);
  protected readonly titleMaxLength = CreateEventQuickSetupWizardComponent.titleMaxLength;
  protected readonly form = this.#formBuilder.group({
    category: this.#formBuilder.control<QuickSetupPlanCategoryId | null>(null),
    contentQuestions: this.#formBuilder.control<ContentQuestionsValue | null>(null),
    description: [
      this.isContentQuestionsEnabled ? '' : buildQuickSetupDefaultDescriptionHtml(key => this.#translateService.instant(key)),
      [requiredRichText],
    ],
    galleryMedia: this.#formBuilder.control<CreateMainPlanMediaItem[]>([], {
      validators: [
        createQuickSetupGalleryMediaValidator(() => ({
          hasGalleryContent: this.galleryPhotos.length > 0,
          isUploadInProgress: this.isGalleryUploading(),
        })),
      ],
    }),
    title: ['', [Validators.required, Validators.maxLength(CreateEventQuickSetupWizardComponent.titleMaxLength)]],
    venueId: [null as number | null, [Validators.required]],
  });
  readonly #category = toSignal(this.form.controls.category.valueChanges.pipe(startWith(this.form.controls.category.value)), {
    initialValue: null as QuickSetupPlanCategoryId | null,
  });
  protected readonly contentCategoryId = computed<ContentCategoryId | null>(() => {
    const categoryId = this.#category();

    return categoryId === null ? null : (categoryId as ContentCategoryId);
  });
  readonly #galleryMediaControl = this.form.controls.galleryMedia;
  readonly #isFormValid = toSignal(
    merge(this.form.statusChanges, this.form.valueChanges, this.#galleryMediaControl.statusChanges).pipe(
      startWith(null),
      map(() => ({
        hasGalleryError: this.#galleryMediaControl.invalid && this.#galleryMediaControl.touched,
        isValid: this.form.valid,
      })),
    ),
    {
      initialValue: {
        hasGalleryError: this.#galleryMediaControl.invalid && this.#galleryMediaControl.touched,
        isValid: this.form.valid,
      },
    },
  );
  /**
   * The inventory the preview must describe: the payload the user just submitted, or — until a resume re-saves the
   * inventory step — the session types already configured on the plan.
   */
  readonly #previewInventorySource = computed<QuickSetupPreviewInventorySource | null>(() => {
    const payload = this.savedInventoryPayload();

    if (payload !== null) {
      return { kind: 'inventoryPayload', payload };
    }

    const inventory = this.#resumedSessionTypeInventory();

    return inventory !== null ? { inventory, kind: 'sessionTypeInventory' } : null;
  });
  /** The step the header chevron must land on: the step below the current one, or `null` on the content step. */
  readonly #previousStepIndex = computed<QuickSetupWizardStep | null>(() => {
    switch (this.currentStepIndex()) {
      case QuickSetupWizardStep.Inventory:
        return QuickSetupWizardStep.Content;
      case QuickSetupWizardStep.Schedule:
        return QuickSetupWizardStep.Inventory;
      case QuickSetupWizardStep.Preview:
        return QuickSetupWizardStep.Schedule;
      default:
        return null;
    }
  });

  protected readonly hasGalleryError = computed(() => this.#isFormValid().hasGalleryError);
  /**
   * Whether the schedule step has the inventory figures it needs. In create mode this is exactly
   * `savedInventoryPayload() !== null`; a resume that landed past the inventory step has the fetched session types instead.
   */
  protected readonly hasInventorySource = computed(
    () => this.savedInventoryPayload() !== null || this.#resumedSessionTypeInventory() !== null,
  );
  /**
   * Whether the inventory step defined prices by tier. The schedule step then shows the
   * same tier cells as advanced setup, without the capacity template selector.
   */
  protected readonly isPricesByTier = computed(() => {
    const payload = this.savedInventoryPayload();

    return payload !== null && this.#hasQuickSetupInventoryTierPrices(payload);
  });
  protected readonly isContentStepVisible = computed(() => this.currentStepIndex() === QuickSetupWizardStep.Content);
  /**
   * Whether the header chevron has anywhere to go. The venue form always has the wizard behind it. Otherwise, on the
   * content step it means "back to the event type selector", which only the events-list flow reopens; every later step
   * has a rendered step behind it. On the content step of a project-management run, created or resumed, the chevron
   * stays hidden and is never repurposed as an exit: that wizard exits through the footer **Cancel**, which is rendered
   * on every step but the preview and already routes through the PM-aware close path. A left-pointing chevron would
   * otherwise mean "back" from the events list and "leave" from requests and approvals.
   * Pinned by the resume spec's `isHeaderBackVisible` and project-management exit tests.
   */
  protected readonly isHeaderBackVisible = computed(() => {
    if (this.isCreatingVenue()) {
      return true;
    }

    return this.currentStepIndex() === QuickSetupWizardStep.Content ? !this.#isProjectManagementSource : this.#previousStepIndex() !== null;
  });
  protected readonly isNextDisabled = computed(() => {
    if (this.isSaving() || this.isResumeLoading() || this.isPreviousStepLoading()) {
      return true;
    }

    if (this.currentStepIndex() === QuickSetupWizardStep.Content) {
      return this.isGalleryUploading() || !this.#isFormValid().isValid;
    }

    if (this.currentStepIndex() === QuickSetupWizardStep.Schedule) {
      return !this.isScheduleStepValid();
    }

    if (this.currentStepIndex() === QuickSetupWizardStep.Preview) {
      return this.isPreviewLoading();
    }

    return false;
  });
  protected readonly footerSecondaryButtonLabelKey = computed(() =>
    this.currentStepIndex() === QuickSetupWizardStep.Preview ? 'createEvent.quickSetupWizard.step4.back' : 'common.cancel',
  );
  protected readonly isPreviewStep = computed(() => this.currentStepIndex() === QuickSetupWizardStep.Preview);
  // HACK: temporary. Widen on schedule and on preview, which holds the review feedback.
  protected readonly isExpandedShellStep = computed(() => {
    const stepIndex = this.currentStepIndex();

    return stepIndex === QuickSetupWizardStep.Schedule || stepIndex === QuickSetupWizardStep.Preview;
  });
  // HACK: temporary. Stays false on open, then true after the widened shell toggles, so the mask does not run on open.
  protected readonly hasScheduleStepToggled = linkedSignal<boolean, boolean>({
    source: this.isExpandedShellStep,
    computation: (_isExpandedShellStep: boolean, previous?: { source: boolean; value: boolean }): boolean => previous !== undefined,
  });
  protected readonly nextButtonLabelKey = computed(() => {
    const stepIndex = this.currentStepIndex();

    if (stepIndex === QuickSetupWizardStep.Content) {
      return 'createEvent.quickSetupWizard.step1.next';
    }

    if (stepIndex === QuickSetupWizardStep.Inventory) {
      return 'createEvent.quickSetupWizard.step2.next';
    }

    if (stepIndex === QuickSetupWizardStep.Schedule) {
      return 'createEvent.quickSetupWizard.step3.next';
    }

    return 'createEvent.quickSetupWizard.step4.confirmDraft';
  });
  protected readonly progressStepperItems: IgntProgressStepperItem[] = this.#buildProgressStepperItems();
  protected readonly visibleModalToast = computed(() => {
    const toast = this.modalToast();
    const stepIndex = this.currentStepIndex();

    if (!toast) {
      return null;
    }

    if (toast.stepIndex !== undefined && toast.stepIndex !== stepIndex) {
      return null;
    }

    if (toast.id === SCHEDULE_SUBMIT_ERROR_TOAST_ID) {
      return this.currentStepIndex() === QuickSetupWizardStep.Preview ? toast : null;
    }

    return toast;
  });
  protected readonly uploadDescriptionImage = (file: File): Observable<string> =>
    this.#galleryUploadService.uploadContentImage(file).pipe(
      switchMap(result => {
        if ('error' in result) {
          // The editor drops a failed upload silently, so surface the reason here (unsupported type / upload error).
          this.#showGalleryUploadError(result.error);
          return throwError(() => result.error);
        }

        return of(result.fileUrl);
      }),
    );

  protected readonly uploadGalleryFile = (file: File): Observable<string> => {
    this.isGalleryUploading.set(true);
    this.#galleryMediaControl.updateValueAndValidity();

    const upload$ = this.#isGalleryVideoFile(file) ? this.#uploadGalleryFileToServer(file) : this.#uploadCroppedGalleryImage(file);

    return upload$.pipe(
      finalize(() => {
        this.isGalleryUploading.set(false);
        this.#galleryMediaControl.updateValueAndValidity();
      }),
    );
  };

  constructor() {
    this.#writeOriginService.beginRun();
    this.#applyContentQuestionsFlag();
    // Header / backdrop / ESC closes reach us through the dialog ref, so the wizard derives its own exit result
    // instead of letting the dialog resolve with no result. A caller-supplied `'back'` is forwarded; the completion
    // result is emitted through `#dialogClose`, the pre-override close, so it is never rewritten into an exit.
    this.#dialogRef.close = (result?: CreateEventQuickSetupWizardCloseResult | null): void => {
      this.#requestWizardClose(result === 'back' ? 'back' : undefined);
    };

    if (this.#resumePlanId !== undefined) {
      this.#loadResumedPlan(this.#resumePlanId);
    }

    effect(() => {
      if (this.currentStepIndex() === QuickSetupWizardStep.Inventory) {
        this.inventorySubmitRequest.set(0);
      }
    });

    effect(() => {
      const venueSelect = this.venueSelect();
      const venue = this.#resumedVenueToSelect();

      if (!venueSelect || !venue) {
        return;
      }

      untracked(() => {
        this.#resumedVenueToSelect.set(null);
        venueSelect.selectVenue(venue);
      });
    });

    // `<app-toast>` ran this timer itself and emitted `hidden`; `<ignt-alert>` has no timer, so the wizard keeps
    // the behaviour here. Keyed on the visible toast, so a toast hidden by a step change and shown again restarts
    // its countdown, exactly as re-creating the component used to.
    effect(onCleanup => {
      const toast = this.visibleModalToast();
      if (toast === null || !toast.autoHide) {
        return;
      }

      const timeoutId = setTimeout(() => this.onModalToastHidden(toast.id), MODAL_TOAST_AUTO_HIDE_MS);
      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  protected onBack(): void {
    if (this.isSaving()) {
      return;
    }

    const planId = this.createdPlanId();

    if (planId !== null) {
      this.#fzTracking.track(quickSetupPreviewReturnToSchedule({ ...this.#trackingContext(), plan_id: planId }));
    }

    this.currentStepIndex.set(QuickSetupWizardStep.Schedule);
    this.#cancelPreviewPlanDetailLoad();
    this.modalToast.set(null);
  }

  protected onHeaderBack(): void {
    if (this.isCreatingVenue()) {
      this.onVenueCreateCancel();
      return;
    }

    if (this.isSaving() || this.isPreviousStepLoading()) {
      return;
    }

    if (this.currentStepIndex() === QuickSetupWizardStep.Content) {
      // Only the events-list flow has an event type selector to go back to; the chevron is hidden for project management.
      if (!this.#isProjectManagementSource) {
        this.#requestWizardClose('back');
      }

      return;
    }

    if (this.currentStepIndex() === QuickSetupWizardStep.Preview) {
      this.onBack();
      return;
    }

    const previousStepIndex = this.#previousStepIndex();

    if (previousStepIndex === null) {
      return;
    }

    const previousStepLoad$ = this.#loadResumedStepData(previousStepIndex);

    if (!previousStepLoad$) {
      this.#landOnPreviousStep(previousStepIndex);
      return;
    }

    const currentStepIndex = this.currentStepIndex();

    this.isPreviousStepLoading.set(true);
    previousStepLoad$
      .pipe(
        finalize(() => this.isPreviousStepLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => this.#showPreviousStepLoadError(currentStepIndex),
        next: () => this.#landOnPreviousStep(previousStepIndex),
      });
  }

  protected onCancel(): void {
    this.#requestWizardClose();
  }

  protected onFooterSecondaryAction(): void {
    if (this.isPreviewStep()) {
      this.onBack();
      return;
    }

    this.onCancel();
  }

  protected onGalleryPhotosChange(photos: MediaListItem[]): void {
    this.galleryPhotos = photos;
    this.form.patchValue({
      galleryMedia: mapQuickSetupGalleryMedia(photos),
    });
    this.form.get('galleryMedia')?.markAsDirty();
    this.form.get('galleryMedia')?.markAsTouched();
    this.form.updateValueAndValidity();
  }

  protected onInventorySubmit(payload: QuickSetupInventoryPayload): void {
    const planId = this.createdPlanId();
    const partnerId = this.#partnerService.getPartner()?.id;

    if (!planId || !partnerId) {
      this.isSaving.set(false);
      this.#showErrorMessage(this.#translateService.instant('createEvent.error'));
      return;
    }

    const isFirstInventorySave = this.savedInventoryPayload() === null && this.#resumedSessionTypeInventory() === null;
    const payload$ = this.#isInventoryIdsRefreshPending
      ? this.#loadInventoryAssignedIds(planId).pipe(map(assignedIds => applyQuickSetupInventoryAssignedIds(payload, assignedIds)))
      : of(payload);

    payload$
      .pipe(
        switchMap(resolvedPayload =>
          this.#inventoryService.upsertInventory(partnerId, planId, resolvedPayload).pipe(
            tap(() => {
              this.#fzTracking.track(
                quickSetupInventorySaved({
                  ...this.#trackingContext(),
                  addon_count: resolvedPayload.add_ons.length,
                  plan_id: planId,
                  ticket_count: resolvedPayload.capacity_groups.reduce(
                    (total, group) => total + group.tickets.length,
                    resolvedPayload.ungrouped_tickets.length,
                  ),
                }),
              );
              this.savedInventoryPayload.set(resolvedPayload);
              this.#isInventoryIdsRefreshPending = true;
            }),
          ),
        ),
        switchMap(() => this.#loadInventoryAssignedIds(planId)),
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: assignedIds => {
          this.inventoryAssignedIds.set(assignedIds);
          this.#isInventoryIdsRefreshPending = false;

          if (!isFirstInventorySave) {
            this.scheduleReloadRequest.update(request => request + 1);
          }

          this.#advanceToScheduleStep();
        },
        error: () => this.#showErrorMessage(this.#translateService.instant('createEvent.error')),
      });
  }

  protected onInventorySubmitAborted(): void {
    this.isSaving.set(false);
  }

  protected onInventoryValidityChange(isValid: boolean): void {
    this.isInventoryStepValid.set(isValid);
  }

  protected onModalToastHidden(toastId: string): void {
    if (this.modalToast()?.id === toastId) {
      this.modalToast.set(null);
    }
  }

  protected onNext(): void {
    if (this.isSaving() || this.isResumeLoading()) {
      return;
    }

    if (this.currentStepIndex() === QuickSetupWizardStep.Content) {
      this.#submitContentStep();
      return;
    }

    if (this.currentStepIndex() === QuickSetupWizardStep.Inventory) {
      this.#submitInventoryStep();
      return;
    }

    if (this.currentStepIndex() === QuickSetupWizardStep.Schedule) {
      this.#advanceToPreviewStep();
      return;
    }

    if (this.currentStepIndex() === QuickSetupWizardStep.Preview) {
      this.#confirmDraft();
    }
  }

  protected onScheduleLoadError(): void {
    this.modalToast.set({
      autoHide: true,
      id: SCHEDULE_OPTIONS_LOAD_ERROR_TOAST_ID,
      message: this.#translateService.instant('createEvent.quickSetupWizard.step3.scheduleOptionsLoadError'),
      sentiment: AlertSentiment.danger,
      stepIndex: QuickSetupWizardStep.Schedule,
      testId: 'create-event-quick-setup-schedule-options-load-error-toast',
    });
  }

  protected onScheduleValidityChange(isValid: boolean): void {
    this.isScheduleStepValid.set(isValid);
  }

  protected onTaxAreaLoadError(): void {
    this.modalToast.set({
      autoHide: true,
      id: TAX_AREA_LOAD_ERROR_TOAST_ID,
      message: this.#translateService.instant('createEvent.quickSetupWizard.step2.taxAreaLoadError'),
      sentiment: AlertSentiment.danger,
      stepIndex: QuickSetupWizardStep.Inventory,
      testId: 'create-event-quick-setup-tax-area-load-error-toast',
    });
  }

  protected onVenueChange(venue: Venue | null): void {
    this.form.get('venueId')?.setValue(venue?.id ?? null);
    this.form.get('venueId')?.markAsDirty();
    this.form.get('venueId')?.updateValueAndValidity();
    this.form.get('venueId')?.markAsTouched();
    this.selectedVenue.set(venue);
    this.#planTimezone.set(venue?.timezone ?? null);

    if (venue?.latitude == null || venue?.longitude == null) {
      this.selectedVenueMapUrl.set(null);
      return;
    }

    this.selectedVenueMapUrl.set(this.#googlePlacesService.getMapImageUrl(venue.latitude, venue.longitude));
  }

  protected onVenueCreateCancel(): void {
    if (this.isCreatingVenueSaving()) {
      return;
    }

    this.isCreatingVenue.set(false);
    this.isCreatingVenueDirty.set(false);
    this.modalToast.set(null);
  }

  protected onExistingVenueSelected(venue: Venue): void {
    this.#completeVenueSelection(venue);
  }

  protected onVenueCreated(venue: Venue): void {
    this.#completeVenueSelection(venue);
    this.modalToast.set({
      autoHide: true,
      id: VENUE_CREATED_TOAST_ID,
      message: this.#translateService.instant('createEvent.newVenueCreated'),
      sentiment: AlertSentiment.positive,
      stepIndex: QuickSetupWizardStep.Content,
      testId: 'create-event-quick-setup-venue-created-toast',
    });
  }

  #completeVenueSelection(venue: Venue): void {
    this.isCreatingVenue.set(false);
    this.isCreatingVenueDirty.set(false);
    this.isCreatingVenueSaving.set(false);
    this.venueSelect()?.selectVenue(venue);
  }

  protected onVenueCreateFailed(): void {
    this.modalToast.set({
      autoHide: true,
      id: VENUE_CREATE_ERROR_TOAST_ID,
      message: this.#translateService.instant('venues.createModal.createError'),
      sentiment: AlertSentiment.danger,
      stepIndex: QuickSetupWizardStep.Content,
      testId: 'create-event-quick-setup-venue-create-error-toast',
    });
  }

  protected onVenueCreateRequested(): void {
    this.isCreatingVenue.set(true);
    this.isCreatingVenueDirty.set(false);
    this.modalToast.set(null);
  }

  #advanceToPreviewStep(): void {
    const scheduleStep = this.scheduleStep();
    const inventorySource = this.#previewInventorySource();
    const eventName = this.form.get('title')?.value;
    const planId = this.createdPlanId();

    if (this.isNextDisabled()) {
      scheduleStep?.markFormAsTouched();
      return;
    }

    if (!scheduleStep || !inventorySource || !eventName || planId === null) {
      scheduleStep?.markFormAsTouched();
      this.#showErrorMessage(this.#translateService.instant('createEvent.error'));
      return;
    }

    const calendars = scheduleStep.submit();
    const scheduleStepFormValue = scheduleStep.getFormValue();

    if (!calendars || !scheduleStepFormValue) {
      scheduleStep.markFormAsTouched();
      return;
    }

    const scheduleDayOverlapMessage = scheduleStep.resolveScheduleDayOverlapMessage();

    if (scheduleDayOverlapMessage) {
      scheduleStep.markFormAsTouched();
      this.modalToast.set({
        autoHide: true,
        id: SCHEDULE_DAY_OVERLAP_TOAST_ID,
        message: scheduleDayOverlapMessage,
        sentiment: AlertSentiment.danger,
        stepIndex: QuickSetupWizardStep.Schedule,
        testId: 'create-event-quick-setup-schedule-day-overlap-toast',
      });
      return;
    }

    const scheduleFormValue = scheduleStepFormValue.schedules[0];

    this.pendingScheduleCalendars.set(calendars);
    this.#fzTracking.track(
      quickSetupScheduleContinue({
        ...this.#trackingContext(),
        plan_id: planId,
        recurring_dates: scheduleFormValue.dateFrequency === CalendarDateFrequency.RecurrentDates,
        recurring_time_slots: scheduleFormValue.timeSlotFrequency === CalendarTimeSlotFrequency.RecurrentTimeSlots,
      }),
    );
    this.previewData.set(
      buildQuickSetupPreviewData({
        coverImageUrl: resolveQuickSetupPreviewCoverUrl(this.galleryPhotos) ?? this.#resumedCoverImageUrl(),
        eventName,
        inventorySource,
        locale: this.#translateService.currentLang || 'en',
        planBaseLocale: undefined,
        scheduleFormValue: scheduleStepFormValue,
        translate: (key: string, params?: Record<string, string | number>) => this.#translateService.instant(key, params),
        venue: this.selectedVenue(),
      }),
    );
    this.currentStepIndex.set(QuickSetupWizardStep.Preview);
    this.modalToast.set({
      autoHide: true,
      id: SCHEDULE_SAVED_TOAST_ID,
      message: this.#translateService.instant('createEvent.quickSetupWizard.step4.scheduleSavedToast'),
      sentiment: AlertSentiment.positive,
      stepIndex: QuickSetupWizardStep.Preview,
      testId: 'create-event-quick-setup-schedule-saved-toast',
    });
    this.#loadPreviewPlanDetail();
  }

  #cancelPreviewPlanDetailLoad(): void {
    this.#previewPlanDetailCancelled$.next();
    this.isPreviewLoading.set(false);
  }

  #loadPreviewPlanDetail(): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    const planId = this.createdPlanId();

    if (!partnerId || !planId) {
      return;
    }

    this.#cancelPreviewPlanDetailLoad();
    this.isPreviewLoading.set(true);

    forkJoin({
      planDetail: this.#planDetailService.getPlanDetail(partnerId, planId).pipe(catchError(() => of(null))),
      planSettings: this.#mainPlanSettingsService.getMainPlanGeneralSettings(partnerId, planId).pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => this.isPreviewLoading.set(false)),
        takeUntil(this.#previewPlanDetailCancelled$),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ planDetail, planSettings }) => {
        if (this.currentStepIndex() !== QuickSetupWizardStep.Preview) {
          return;
        }

        const inventorySource = this.#previewInventorySource();
        const locale = this.#translateService.currentLang || 'en';
        const translate = (key: string, params?: Record<string, string | number>) => this.#translateService.instant(key, params);

        this.previewData.update(data => {
          if (!data || !inventorySource) {
            return data;
          }

          const previewWithCurrency = applyPlanCurrencyToPreviewData(
            data,
            inventorySource,
            planCurrencyOf(planDetail) ?? undefined,
            locale,
          );

          return {
            ...previewWithCurrency,
            planLanguageLabel: resolvePlanLanguageLabel(planDetail?.baseLocale),
            validationMethodLabel: resolveValidationMethodLabel(planSettings?.validationMethod, translate),
          };
        });
      });
  }

  #advanceToInventoryStep(planId: number, placeId: number): void {
    const { category, title } = this.form.getRawValue();
    const isFirstContentSave = this.createdPlanId() === null;

    this.#fzTracking.track(
      quickSetupContentSaved({
        ...this.#trackingContext(),
        category: category ?? '',
        name: title ?? '',
        plan_id: planId,
        venue: this.selectedVenue()?.name ?? '',
      }),
    );
    this.createdPlanId.set(planId);
    this.createdPlaceId.set(placeId);

    if (isFirstContentSave) {
      this.isInventoryStepValid.set(false);
    }

    this.currentStepIndex.set(QuickSetupWizardStep.Inventory);
    // Only reached from the subscription of the content create/update, so the venue is already stored on the plan.
    this.#loadInventoryCurrency(planId);
    this.modalToast.set({
      autoHide: true,
      id: CONTENT_SAVED_TOAST_ID,
      message: this.#translateService.instant('createEvent.quickSetupWizard.step1.contentSavedToast'),
      sentiment: AlertSentiment.positive,
      stepIndex: QuickSetupWizardStep.Inventory,
      testId: 'create-event-quick-setup-content-saved-toast',
    });
  }

  #advanceToScheduleStep(): void {
    this.isScheduleStepValid.set(false);
    this.currentStepIndex.set(QuickSetupWizardStep.Schedule);
    this.modalToast.set({
      autoHide: true,
      id: INVENTORY_SAVED_TOAST_ID,
      message: this.#translateService.instant('createEvent.quickSetupWizard.step2.inventorySavedToast'),
      sentiment: AlertSentiment.positive,
      stepIndex: QuickSetupWizardStep.Schedule,
      testId: 'create-event-quick-setup-inventory-saved-toast',
    });
  }

  #loadInventoryAssignedIds(planId: number): Observable<QuickSetupInventoryAssignedIds> {
    return this.#sessionTypeService.getSessionTypesInventoryByPlanId(planId).pipe(
      map(inventory => {
        if (!inventory) {
          throw new Error(`Quick setup inventory of plan ${planId} could not be loaded`);
        }

        const idsByName = (isAddOn: boolean): Record<string, number> =>
          Object.fromEntries(
            inventory.sessionTypes
              .filter(sessionType => Boolean(sessionType.isAddOn) === isAddOn)
              .map(sessionType => [sessionType.label, sessionType.id]),
          );

        return {
          addOnIdsByName: idsByName(true),
          groupIdsByName: Object.fromEntries(inventory.sessionTypeGroups.map(group => [group.name, group.id])),
          ticketIdsByName: idsByName(false),
        };
      }),
    );
  }

  #hasQuickSetupInventoryTierPrices(payload: QuickSetupInventoryPayload): boolean {
    const tickets = payload.capacity_groups.flatMap(group => group.tickets);

    return [...payload.add_ons, ...tickets, ...payload.ungrouped_tickets].some(item => item.tier_prices !== undefined);
  }

  #applyContentQuestionsFlag(): void {
    if (this.isContentQuestionsShown) {
      this.form.controls.description.disable({ emitEvent: false });
      return;
    }

    this.form.controls.contentQuestions.disable({ emitEvent: false });
  }

  #applyResumedPlan(planDetail: PlanDetail, inventory: SessionTypeInventory | null): void {
    const venue = this.#resumedVenueOf(planDetail);

    if (!venue || venue.id == null) {
      this.#failResumedPlanLoad();
      return;
    }

    const resumedVenue = normalizeResumedVenue(venue);
    const resumedPlaceId = planDetail.venues?.[0]?.id ?? venue.id;

    // Only a resume that lands on a step clears the loading state; every failure path keeps it raised (see below).
    this.isResumeLoading.set(false);
    this.form.patchValue({
      description: planDetail.description ?? '',
      title: planDetail.name,
      venueId: venue.id,
    });
    this.selectedVenue.set(resumedVenue);
    this.#resumedVenueToSelect.set(resumedVenue);
    this.#planTimezone.set(planTimezoneOf(planDetail));
    this.createdPlaceId.set(resumedPlaceId);
    this.#resumedShowcasePlaceId = resumedPlaceId === venue.id ? null : resumedPlaceId;
    // `gallery` is a plain list of media URLs whose first entry is the plan cover (as `PlanDetailPublicAdapter` reads
    // it). Set before the landing branches: both landings reach the preview before the user edits the gallery.
    this.#resumedCoverImageUrl.set(planDetail.gallery?.[0] || null);

    if (!inventory || inventory.sessionTypes.length === 0) {
      this.#landOnResumedInventoryStep(planDetail);
      return;
    }

    this.#resumedSessionTypeInventory.set(inventory);
    this.#landOnResumedScheduleStep();
  }

  #mapResumedGalleryPhotos(gallery: PlanGallery | null): MediaListItem[] {
    return (gallery?.media ?? []).map(media => ({
      id: media.id,
      media_type: media.media_type,
      name: media.name,
      playback_rate: media.playback_rate,
      poster: media.poster,
      url: media.url,
    }));
  }

  /**
   * A showcase keeps its catalog plan's physical places, so `venues[0]` is the hub's venue, never the
   * one the operator picked. Resuming with it would send it back on finish and overwrite the choice.
   */
  #resumedVenueOf(planDetail: PlanDetail): Venue | VenueDTO | undefined {
    if (this.isShowcaseVenueEditable && planDetail.type === PlanKind.SHOWCASE && planDetail.showcaseVenue) {
      return planDetail.showcaseVenue;
    }

    return planDetail.venues?.[0];
  }

  /**
   * Closes straight away: falling back to the content step would create a second plan for the same information
   * request, and there is nothing for the user to confirm about leaving a wizard that never opened.
   *
   * `isResumeLoading` is deliberately left raised on every failure path — including the synchronous no-partner one,
   * which never reaches the request. In resume mode no other template branch can match at step 0, so clearing it
   * would render the dialog header, stepper and footer around an empty body for the whole closing animation; keeping
   * it raised leaves the spinner covering the close instead.
   */
  #failResumedPlanLoad(): void {
    this.#showErrorMessage(this.#translateService.instant('createEvent.error'));
    this.#dialogClose(this.#buildExitResult());
  }

  #landOnResumedInventoryStep(planDetail: PlanDetail): void {
    this.isInventoryStepValid.set(false);
    this.currentStepIndex.set(QuickSetupWizardStep.Inventory);
    // The plan detail the resume just read is as fresh as a new request would be.
    this.#inventoryCurrencyRead$.next(of({ currency: planCurrencyOf(planDetail), hasError: false }));
  }

  #landOnPreviousStep(stepIndex: QuickSetupWizardStep): void {
    const planId = this.createdPlanId();

    this.currentStepIndex.set(stepIndex);
    this.modalToast.set(null);

    if (stepIndex === QuickSetupWizardStep.Inventory && planId !== null) {
      this.#loadInventoryCurrency(planId);
    }
  }

  // The places list carries no currency, so the inventory step shows the one the backend stored for the plan's venue.
  // The currency is informational: a failed read only leaves it unavailable, it never blocks the step.
  #loadInventoryCurrency(planId: number): void {
    const partnerId = this.#partnerService.getPartner()?.id;

    this.#inventoryCurrencyRead$.next(
      partnerId !== undefined
        ? this.#planDetailService.getPlanDetail(partnerId, planId).pipe(
            tap(planDetail => this.#planTimezone.set(planTimezoneOf(planDetail))),
            map(planDetail => ({ currency: planCurrencyOf(planDetail), hasError: false })),
            catchError((error: HttpErrorResponse) => {
              this.#sentryLoggerService.logWarning(`Quick setup inventory currency could not be read (status ${error.status})`);

              return of({ currency: null, hasError: true });
            }),
          )
        : of({ currency: null, hasError: true }),
    );
  }

  #landOnResumedScheduleStep(): void {
    this.isScheduleStepValid.set(false);
    this.currentStepIndex.set(QuickSetupWizardStep.Schedule);
    this.modalToast.set({
      autoHide: true,
      id: INVENTORY_ALREADY_CONFIGURED_TOAST_ID,
      message: this.#translateService.instant('createEvent.quickSetupWizard.step2.inventoryAlreadyConfiguredToast'),
      sentiment: AlertSentiment.info,
      stepIndex: QuickSetupWizardStep.Schedule,
      testId: 'create-event-quick-setup-inventory-already-configured-toast',
    });
  }

  #loadResumedStepData(stepIndex: QuickSetupWizardStep): Observable<void> | null {
    const planId = this.createdPlanId();

    if (planId === null) {
      return null;
    }

    if (stepIndex === QuickSetupWizardStep.Content && this.#isResumedContentPending) {
      return this.#loadResumedContent(planId);
    }

    const inventory = this.#resumedSessionTypeInventory();

    if (stepIndex === QuickSetupWizardStep.Inventory && inventory !== null && this.inventoryPrefill() === null) {
      return this.#loadResumedInventoryPrefill(planId, inventory);
    }

    return null;
  }

  #loadResumedContent(planId: number): Observable<void> {
    const partnerId = this.#partnerService.getPartner()?.id;

    if (!partnerId) {
      return throwError(() => new Error('Quick setup resume has no partner'));
    }

    return forkJoin({
      gallery: this.#planGalleryService.getGalleryOrNull(partnerId, planId),
      planSettings: this.#mainPlanSettingsService.getMainPlanGeneralSettings(partnerId, planId),
    }).pipe(
      map(({ gallery, planSettings }) => {
        const galleryPhotos = this.#mapResumedGalleryPhotos(gallery);

        this.#isResumedContentPending = false;
        this.galleryPhotos = galleryPhotos;
        this.form.patchValue({
          category: ([...quickSetupCategoryIds, ...contentCategoryIds] as string[]).includes(planSettings.category ?? '')
            ? (planSettings.category as QuickSetupPlanCategoryId)
            : null,
          galleryMedia: mapQuickSetupGalleryMedia(galleryPhotos),
        });
      }),
    );
  }

  #loadResumedInventoryPrefill(planId: number, inventory: SessionTypeInventory): Observable<void> {
    return forkJoin({
      capacityTemplates: this.#capacityTemplateService.getCapacityTemplates(planId),
      priceMatrix: this.#priceMatrixService.getPriceMatrix(planId),
    }).pipe(
      map(({ capacityTemplates, priceMatrix }) =>
        this.inventoryPrefill.set(mapResumedInventoryToPrefill(inventory, capacityTemplates, priceMatrix)),
      ),
    );
  }

  #showPreviousStepLoadError(stepIndex: QuickSetupWizardStep): void {
    this.modalToast.set({
      autoHide: true,
      id: PREVIOUS_STEP_LOAD_ERROR_TOAST_ID,
      message: this.#translateService.instant('createEvent.quickSetupWizard.previousStepLoadError'),
      sentiment: AlertSentiment.danger,
      stepIndex,
      testId: 'create-event-quick-setup-previous-step-load-error-toast',
    });
  }

  /**
   * Resume entry point: reads the half-configured plan without writing anything, then lands on the first step the
   * user still has to fill in.
   */
  #loadResumedPlan(planId: number): void {
    const partnerId = this.#partnerService.getPartner()?.id;

    if (!partnerId) {
      this.#failResumedPlanLoad();
      return;
    }

    forkJoin({
      // A failed session-types read must not look like an empty inventory: that would land the user on the inventory
      // step and post it a second time. Any failure of any request aborts the resume instead.
      inventory: this.#sessionTypeService.getSessionTypesInventoryByPlanId(planId),
      planDetail: this.#planDetailService.getPlanDetail(partnerId, planId),
    })
      .pipe(
        // The dialog is disposed only after its leave animation, so `takeUntilDestroyed` alone would let a late
        // response land on a wizard the user already dismissed: an unrequested error modal and a second close.
        takeUntil(this.#resumeCancelled$),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => this.#failResumedPlanLoad(),
        next: ({ inventory, planDetail }) => this.#applyResumedPlan(planDetail, inventory),
      });
  }

  #requestWizardClose(result?: CreateEventQuickSetupWizardCloseResult): void {
    if (this.isSaving() || this.isCreatingVenueSaving()) {
      return;
    }

    const createdPlanId = this.createdPlanId();
    const closeResult: CreateEventQuickSetupWizardCloseResult =
      result === 'back' && createdPlanId === null ? 'back' : this.#buildExitResult();

    // A resume knows its plan id from construction, so `createdPlanId` alone would confirm an exit out of a wizard
    // that has not opened yet. While the resumed plan is still loading there is nothing to confirm, and the in-flight
    // read must be cancelled so a late response cannot land on a dismissed wizard.
    if (createdPlanId !== null && !this.isResumeLoading()) {
      this.#showExitConfirmDialog(() => {
        this.#trackWizardExit();
        this.#dialogClose(closeResult);

        // Plan decision 9: no navigation out of project management. The caller reloads its list and the draft
        // stays reachable from the information request — sending this persona to /plans would land it on a route
        // guard it may well not clear.
        if (this.#isProjectManagementSource) {
          return;
        }

        void this.#router.navigate(['/plans/dashboard'], { queryParams: { planId: createdPlanId } });
      });
      return;
    }

    if (
      this.currentStepIndex() === QuickSetupWizardStep.Content &&
      (this.form.dirty || (this.isCreatingVenue() && this.isCreatingVenueDirty()))
    ) {
      this.#showDiscardConfirmDialog(() => {
        this.#resumeCancelled$.next();
        this.#trackWizardExit();
        this.#dialogClose(closeResult);
      });
      return;
    }

    this.#resumeCancelled$.next();
    this.#trackWizardExit();
    this.#dialogClose(closeResult);
  }

  #buildExitResult(): CreateEventQuickSetupWizardResult {
    return { completed: false, planId: this.createdPlanId() };
  }

  #trackWizardExit(): void {
    const stepIndex = this.currentStepIndex();
    const planId = this.createdPlanId();
    const lastStepReached = this.#mapQuickSetupStepIndexToAbandonStep(stepIndex);

    if (lastStepReached === null) {
      return;
    }

    if (stepIndex > QuickSetupWizardStep.Content && planId === null) {
      return;
    }

    this.#fzTracking.track(
      planCreationAbandoned({
        creationFlow: 'quick',
        lastStepReached,
        ...(planId !== null ? { planId } : {}),
      }),
    );
  }

  #mapQuickSetupStepIndexToAbandonStep(stepIndex: QuickSetupWizardStep): PlanCreationAbandonStep | null {
    switch (stepIndex) {
      case QuickSetupWizardStep.Content:
        return 'content';
      case QuickSetupWizardStep.Inventory:
        return 'ticket_types';
      case QuickSetupWizardStep.Schedule:
        return 'schedule';
      case QuickSetupWizardStep.Preview:
        return 'schedule';
      default:
        return null;
    }
  }

  #trackingContext(): QuickSetupTrackingContext {
    return buildQuickSetupTrackingContext({
      informationRequestId: this.#data.informationRequestId,
      resumePlanId: this.#resumePlanId,
      source: this.#data.source,
    });
  }

  #trackPlanCreated(planId: number): void {
    const trackingContext = this.#trackingContext();

    this.#fzTracking.track(
      createEvent({
        eventType: this.eventType,
        flow: 'quick',
        isResume: trackingContext.is_resume,
        planId,
        source: trackingContext.source,
        ...(trackingContext.information_request_id !== undefined ? { informationRequestId: trackingContext.information_request_id } : {}),
      }),
    );
  }

  #showExitConfirmDialog(onConfirm: () => void): void {
    openConfirmModalWithLabels(this.#dialogService, this.#environmentInjector, {
      cancelButton: this.#translateService.instant('createEvent.quickSetupWizard.exitConfirm.cancel'),
      // The default copy points the user at their Dashboard, which is false for a project-management exit: the
      // user stays on the records list, and may not even clear the /plans guard.
      message: this.#translateService.instant(
        this.#isProjectManagementSource
          ? 'createEvent.quickSetupWizard.exitConfirm.messageFromInformationRequest'
          : 'createEvent.quickSetupWizard.exitConfirm.message',
      ),
      okButton: this.#translateService.instant('createEvent.quickSetupWizard.exitConfirm.exit'),
      title: this.#translateService.instant('createEvent.quickSetupWizard.exitConfirm.title'),
    })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          onConfirm();
        }
      });
  }

  #showDiscardConfirmDialog(onConfirm: () => void): void {
    openConfirmModalWithLabels(this.#dialogService, this.#environmentInjector, {
      cancelButton: this.#translateService.instant('createEvent.quickSetupWizard.discardConfirm.cancel'),
      isDestructive: true,
      message: this.#translateService.instant('createEvent.quickSetupWizard.discardConfirm.message'),
      okButton: this.#translateService.instant('createEvent.quickSetupWizard.discardConfirm.discard'),
      title: this.#translateService.instant('createEvent.quickSetupWizard.discardConfirm.title'),
    })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          onConfirm();
        }
      });
  }

  #buildProgressStepperItems(): IgntProgressStepperItem[] {
    return [
      {
        description: this.#translateService.instant('createEvent.quickSetupWizard.steps.contentDescription'),
        id: 'content',
        label: this.#translateService.instant('createEvent.quickSetupWizard.steps.content'),
      },
      {
        description: this.#translateService.instant('createEvent.quickSetupWizard.steps.inventoryDescription'),
        id: 'inventory',
        label: this.#translateService.instant('createEvent.quickSetupWizard.steps.inventory'),
      },
      {
        description: this.#translateService.instant('createEvent.quickSetupWizard.steps.scheduleDescription'),
        id: 'schedule',
        label: this.#translateService.instant('createEvent.quickSetupWizard.steps.schedule'),
      },
      {
        description: this.#translateService.instant('createEvent.quickSetupWizard.steps.reviewDescription'),
        id: 'review',
        label: this.#translateService.instant('createEvent.quickSetupWizard.steps.review'),
      },
    ];
  }

  #completeSuccessfulScheduleSubmit(planId: number): void {
    this.#inventoryProvisioningService.markProvisioning(planId);
    this.#fzTracking.track(quickSetupPreviewConfirmed({ ...this.#trackingContext(), plan_id: planId }));
    this.#dialogClose({ completed: true, planId });

    // Plan decision 9 again — and the toast goes with the navigation: the toast host is the app layout, so this
    // one would render over the records list and double up with the permission-aware toast that list raises on
    // the very same close. The records list owns the completion feedback there.
    if (this.#isProjectManagementSource) {
      return;
    }

    void this.#router.navigate(['/plans/dashboard'], { queryParams: { planId } });
    this.#toastService.add({
      message: this.#translateService.instant('createEvent.quickSetupWizard.step4.dashboardSuccessToast'),
      sentiment: AlertSentiment.positive,
    });
  }

  #confirmDraft(): void {
    if (this.isPreviewLoading()) {
      return;
    }

    const planId = this.createdPlanId();
    const placeId = this.createdPlaceId();
    const calendars = this.pendingScheduleCalendars();

    if (!planId || !placeId || calendars.length === 0) {
      this.#showErrorMessage(this.#translateService.instant('createEvent.error'));
      return;
    }

    this.isSaving.set(true);

    this.#quickSetupScheduleService
      .createCalendars(planId, placeId, calendars)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => {
          this.modalToast.set({
            autoHide: true,
            id: SCHEDULE_SUBMIT_ERROR_TOAST_ID,
            message: this.#translateService.instant('createEvent.quickSetupWizard.step4.confirmError'),
            sentiment: AlertSentiment.danger,
            testId: 'create-event-quick-setup-schedule-submit-error-toast',
          });
        },
        next: () => {
          this.#sendReviewFeedback(planId);
          this.#completeSuccessfulScheduleSubmit(planId);
        },
      });
  }

  #resolveDescription(): string {
    const { category, contentQuestions, description } = this.form.getRawValue();

    if (!this.isContentQuestionsShown) {
      return description ?? '';
    }

    if (contentQuestions === null) {
      return '';
    }

    const categoryDefinition = category === null ? undefined : this.#contentQuestionsCatalogService.findCategoryById(category);
    const verticalId = categoryDefinition?.verticalId ?? null;

    if (verticalId === null) {
      return contentQuestions;
    }

    return prependVerticalToContentQuestionsDescription(
      contentQuestions,
      this.#translateService.instant(`${contentQuestionsTranslationPrefix}.verticals.${verticalId}`),
      key => this.#translateService.instant(key),
    );
  }

  /**
   * Sent once per completed run, from the success path of the calendar creation and before the dialog closes
   * while the preview step is still mounted. A row means "this request was submitted", so a failed creation
   * that the partner retries or abandons must leave none behind. The send itself is fire-and-forget inside
   * the service.
   */
  #sendReviewFeedback(planId: number): void {
    const feedback = (this.previewStep()?.getFeedback() ?? '').trim();
    const partnerId = this.#partnerService.getPartner()?.id;

    if (!partnerId) {
      return;
    }

    this.#quickSetupFeedbackService.sendFeedback(partnerId, { feedback, main_plan_id: planId, source: 'quick_setup_review' });
  }

  #showErrorMessage(message: string): void {
    this.#dialogService.openMessageModal(this.#translateService.instant('common.errorTitle'), message);
  }

  #isGalleryVideoFile(file: File): boolean {
    return file.type.includes('video');
  }

  #openImageCropModal(file: File): Observable<File | null> {
    const dialogRef = this.#dialogService.openModal<File, GalleryImageCropModalData>(GalleryImageCropModalComponent, {
      data: { imageFile: file },
      disableCloseShortcuts: true,
      size: 'lg',
    });

    return dialogRef.closed$.pipe(
      take(1),
      map(result => result ?? null),
    );
  }

  #showGalleryUploadError(reason: CreateEventGalleryUploadErrorReason): void {
    this.#showGalleryUploadMessage(CREATE_EVENT_GALLERY_UPLOAD_ERROR_I18N_KEYS[reason]);
  }

  #showGalleryUploadMessage(messageKey: string, interpolateParams?: Record<string, number | string>): void {
    this.modalToast.set({
      autoHide: true,
      id: this.galleryUploadErrorToastId,
      message: this.#translateService.instant(messageKey, interpolateParams),
      sentiment: AlertSentiment.danger,
      stepIndex: QuickSetupWizardStep.Content,
      testId: 'create-event-quick-setup-gallery-upload-error-toast',
    });
  }

  #uploadCroppedGalleryImage(file: File): Observable<string> {
    return validateImagePreCrop(file).pipe(
      mergeMap(result => {
        if (result.status === 'invalid_file') {
          this.#showGalleryUploadMessage('planEdition.galleryEdition.invalidImageMessage');
          return throwError(() => result.status);
        }

        if (result.status === 'too_small') {
          this.#showGalleryUploadMessage('planEdition.galleryEdition.invalidImageTooSmallMessage', {
            height: result.height,
            minSize: result.minSize,
            width: result.width,
          });
          return throwError(() => result.status);
        }

        return this.#openImageCropModal(file);
      }),
      mergeMap(croppedFile => {
        if (croppedFile === null) {
          return throwError(() => 'crop_cancelled');
        }

        if (croppedFile.size > GALLERY_IMAGE_MAX_SIZE_BYTES) {
          this.#showGalleryUploadMessage('planEdition.galleryEdition.cropPrepareError');
          return throwError(() => 'crop_too_large');
        }

        return this.#uploadGalleryFileToServer(croppedFile);
      }),
    );
  }

  #uploadGalleryFileToServer(file: File): Observable<string> {
    return this.#galleryUploadService.uploadFile(file).pipe(
      switchMap(result => {
        if ('error' in result) {
          this.#showGalleryUploadError(result.error);
          return throwError(() => result.error);
        }

        return of(result.fileUrl);
      }),
    );
  }

  #submitContentStep(): void {
    if (this.isNextDisabled()) {
      this.form.markAllAsTouched();
      this.contentQuestions()?.markFormAsTouched();
      return;
    }

    const createdPlanId = this.createdPlanId();
    const createdPlaceId = this.createdPlaceId();

    if (createdPlanId !== null && createdPlaceId !== null) {
      this.#updateContentStep(createdPlanId);
      return;
    }

    // A resume already has a plan: creating another one would duplicate it against the same information request.
    if (this.#isResuming) {
      return;
    }

    const { category, galleryMedia, title, venueId } = this.form.getRawValue();

    this.isSaving.set(true);

    this.#quickSetupService
      .createQuickSetupPlan({
        category: category!,
        description: this.#resolveDescription(),
        eventType: this.eventType,
        galleryMedia: galleryMedia ?? [],
        source: this.#data.source,
        title: title!,
        venueId: venueId!,
        ...(this.#informationRequestIdToLinkOnCreation ? { informationRequestId: this.#informationRequestIdToLinkOnCreation } : {}),
      })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(result => {
        if (!result) {
          this.#showErrorMessage(this.#translateService.instant('createEvent.error'));
          return;
        }

        this.#trackPlanCreated(result.planId);
        this.#refreshPlansAfterCreation();
        this.#advanceToInventoryStep(result.planId, venueId!);
      });
  }

  #refreshPlansAfterCreation(): void {
    this.#planService.clearPlansCache();
    this.#searchBarService.clearPlanList();
  }

  #submitInventoryStep(): void {
    if (this.isSaving()) {
      return;
    }

    if (!this.isInventoryStepValid()) {
      this.inventorySubmitRequest.update(request => request + 1);
      return;
    }

    const planId = this.createdPlanId();
    const partnerId = this.#partnerService.getPartner()?.id;

    if (!planId || !partnerId) {
      this.#showErrorMessage(this.#translateService.instant('createEvent.error'));
      return;
    }

    this.isSaving.set(true);
    this.inventorySubmitRequest.update(request => request + 1);
  }

  #updateContentStep(planId: number): void {
    const { category, galleryMedia, title, venueId } = this.form.getRawValue();
    const venue = this.selectedVenue();

    if (venue === null || venueId === null) {
      this.#showErrorMessage(this.#translateService.instant('createEvent.error'));
      return;
    }

    this.isSaving.set(true);

    this.#quickSetupService
      .updateQuickSetupPlan(
        planId,
        {
          category: category!,
          description: this.#resolveDescription(),
          eventType: this.eventType,
          galleryMedia: galleryMedia ?? [],
          title: title!,
          venueId,
        },
        venue,
      )
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(result => {
        if (result === null) {
          this.#showErrorMessage(this.#translateService.instant('createEvent.error'));
          return;
        }

        this.#refreshPlansAfterCreation();
        this.#advanceToInventoryStep(result.planId, this.#resumedShowcasePlaceId ?? venueId);
      });
  }
}
