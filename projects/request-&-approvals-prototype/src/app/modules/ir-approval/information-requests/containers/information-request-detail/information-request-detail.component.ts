import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AlertConfigFormComponent } from '@fz-original/app/modules/ir-approval/shared/components/alert-config-form/alert-config-form.component';
import { DriveFolderButtonComponent } from '@fz-original/app/modules/ir-approval/shared/components/drive-folder-button/drive-folder-button.component';
import { EditHistoryViewComponent } from '@fz-original/app/modules/ir-approval/shared/components/edit-history-view/edit-history-view.component';
import { UnsavedChangesExitDialogComponent } from '@fz-original/app/modules/ir-approval/shared/components/unsaved-changes-exit-dialog/unsaved-changes-exit-dialog.component';
import { AlertConfigFormValue } from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';
import { UnsavedChangesExitChoice } from '@fz-original/app/modules/ir-approval/shared/models/unsaved-changes-exit-dialog.model';
import { fromAlertConfigPayload, toAlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/utils/alert-config-payload.util';
import { driveSyncPollMaxIdlePolls, ticksWhileVisible } from '@fz-original/app/modules/ir-approval/shared/utils/visible-polling.util';
import { PROJECT_MANAGEMENT_QUICK_SETUP_FROM_IR_FLAG } from '@fz-original/app/modules/project-management/project-management.optimizely-features';
import { ProjectsService } from '@fz-original/app/modules/project-management/services/projects.service';
import { PermissionBaseModule } from '@fz-original/app/shared/directives/permission-based/permission-base.module';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { FzAssistantHostConfig } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-host.model';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { FzAssistantHostDirective } from '@fz-original/app/shared/services/fz-assistant/host/fz-assistant-host.directive';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { CreateMainPlanService } from '@fz-original/app/shared/services/plan/create-main-plan.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntButtonComponent, IgntDialogService, IgntPillButtonComponent } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { IgntTagComponent, TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, defer, forkJoin, Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, exhaustMap, filter, map, switchMap, take, takeUntil, takeWhile, tap } from 'rxjs/operators';

import { IrAvailableQuestionsComponent } from '../../components/ir-available-questions/ir-available-questions.component';
import { IrFormLayoutComponent } from '../../components/ir-form-layout/ir-form-layout.component';
import { withBuiltInStepperTemplates } from '../../models/built-in-stepper-templates';
import { DriveLinkImport, InformationRequestWithDriveLinkImports } from '../../models/drive-link-import.model';
import {
  fileAnswerKey,
  InformationRequestFileAnswer,
  InformationRequestQuestion,
  InformationRequestQuestionType,
  isFileAnswerAwaitingSave,
  isFileAnswerSyncing,
} from '../../models/information-request-question.model';
import { informationRequestStatusLabelKey } from '../../models/information-request-status-label.util';
import { InformationRequestStatus } from '../../models/information-request-status.enum';
import { InformationRequestTemplateSummary } from '../../models/information-request-template.model';
import { InformationRequest } from '../../models/information-request.model';
import {
  buildAnswersForm,
  buildAnswersSnapshot,
  isInformationRequestComplete,
  mergeUploadedFileAnswers,
  type IrAnswersForm,
} from '../../models/ir-answers-form.util';
import { hasPendingFieldEdits, IrFieldAction, IrFieldEditingState } from '../../models/ir-field-editing.model';
import { MAIN_EVENT_REQUEST_TEMPLATE_KEY } from '../../models/main-event-stepper-template';
import { InformationRequestUploadService } from '../../services/information-request-upload.service';
import { FieldConfigPayload, InformationRequestsService, UpdateAnswerPayload } from '../../services/information-requests.service';
import { IrFileSyncTrackerService } from '../../services/ir-file-sync-tracker.service';
import { templateKeyToBackfill, withTemplateSections } from '../../utils/template-sections.util';

type DetailErrorKey = 'loadFailed' | 'forbidden' | 'notFound';

type CreatePlanErrorKey = 'venueNotGeocoded' | 'venueCurrency' | 'partnershipType' | 'incomplete' | 'notFound' | 'generic';

type FieldConfigErrorKey = 'answered' | 'locked' | 'notEditable' | 'generic';

const CREATE_PLAN_ERROR_KEY_BY_CODE: Record<string, CreatePlanErrorKey> = {
  IR_PROJECT_MISSING: 'incomplete',
  PARTNERSHIP_TYPE_MISSING: 'partnershipType',
  VENUE_CURRENCY_UNRESOLVED: 'venueCurrency',
  VENUE_NOT_GEOCODED: 'venueNotGeocoded',
};

const FIELD_CONFIG_ERROR_KEY_BY_CODE: Record<string, FieldConfigErrorKey> = {
  add_not_supported: 'generic',
  duplicate_question: 'generic',
  information_request_not_editable: 'notEditable',
  question_locked: 'locked',
  questions_have_answers: 'answered',
  unknown_question: 'generic',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    AlertConfigFormComponent,
    FzAssistantHostDirective,
    IgntWrapperCardComponent,
    IgntTagComponent,
    IgntButtonComponent,
    IgntPillButtonComponent,
    IgntCheckboxComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    DriveFolderButtonComponent,
    EditHistoryViewComponent,
    IrFormLayoutComponent,
    IrAvailableQuestionsComponent,
    PermissionBaseModule,
  ],
  providers: [IrFileSyncTrackerService],
  selector: 'app-information-request-detail',
  standalone: true,
  styleUrls: ['./information-request-detail.component.scss'],
  templateUrl: './information-request-detail.component.html',
})
export class InformationRequestDetailComponent {
  /** Quiet window that coalesces a burst of upload completions (e.g. a directory drop) into one refetch. */
  static readonly uploadRefreshDebounceMs = 300;
  static readonly syncPollIntervalMs = 5000;

  readonly assistantHostConfig: FzAssistantHostConfig = {
    viewId: 'feverhub_information_request',
  };
  readonly request = signal<InformationRequest | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<DetailErrorKey | null>(null);
  readonly launchId = signal<string>('');
  readonly partnerId = signal<number | null>(null);
  readonly saving = signal<boolean>(false);
  readonly saveError = signal<boolean>(false);
  readonly dirty = signal<boolean>(false);
  readonly activeTabIndex = signal<number>(0);
  readonly editingAlerts = signal<boolean>(false);
  readonly savingAlerts = signal<boolean>(false);
  private readonly alertConfigForm = viewChild(AlertConfigFormComponent);
  readonly isAlertConfigDirectoryLoaded = computed(() => this.alertConfigForm()?.isDirectoryLoaded() ?? false);
  readonly alertsSaveError = signal<boolean>(false);
  readonly savingAiDeclaration = signal<boolean>(false);
  readonly aiDeclarationError = signal<boolean>(false);
  readonly showsAiDeclaration = computed<boolean>(() => this.request()?.aiDeclarationEnabled === true);
  readonly editingFields = signal<boolean>(false);
  readonly savingFields = signal<boolean>(false);
  readonly loadingFieldCatalog = signal<boolean>(false);
  readonly fieldCatalogFailed = signal<boolean>(false);
  readonly fieldsErrorKey = signal<FieldConfigErrorKey | null>(null);
  readonly pendingRequired = signal<Record<string, boolean>>({});
  readonly pendingAdd = signal<string[]>([]);
  readonly pendingRemove = signal<string[]>([]);
  readonly templateSummary = signal<InformationRequestTemplateSummary | null>(null);
  readonly fieldCatalogReady = computed<boolean>(() => !this.loadingFieldCatalog() && !this.fieldCatalogFailed());
  readonly fieldEditingState = computed<IrFieldEditingState>(() => {
    const catalog = this.templateSummary()?.questions ?? [];
    return {
      lockedRemovalIds: catalog.filter(question => question.removalLocked === true).map(question => question.id),
      lockedRequiredIds: catalog.filter(question => question.requiredLocked === true).map(question => question.id),
      pendingAdd: this.pendingAdd(),
      pendingRemove: this.pendingRemove(),
      pendingRequired: this.pendingRequired(),
    };
  });
  readonly pendingFieldSummary = computed<{ added: number; removed: number; required: number }>(() => ({
    added: this.pendingAdd().length,
    removed: this.pendingRemove().length,
    required: Object.keys(this.#reportableRequired()).length,
  }));
  readonly availableQuestions = computed<InformationRequestQuestion[]>(() => {
    const ir = this.request();
    const template = this.templateSummary();
    if (!ir || !template) {
      return [];
    }
    const present = new Set((ir.questions ?? []).map(question => question.id));
    return template.questions.filter(question => !present.has(question.id));
  });
  readonly alertConfigControl = new FormControl<AlertConfigFormValue | null>(null);
  form: IrAnswersForm = buildAnswersForm([]);
  readonly activeSection = signal<string | null>(null);
  readonly #userService = inject(UserService);
  readonly #optimizely = inject(OptimizelyService);
  readonly #quickSetupFromIr: boolean = this.#optimizely.isFeatureEnabled(PROJECT_MANAGEMENT_QUICK_SETUP_FROM_IR_FLAG) === true;
  readonly currentUserEmail: string | null = this.#userService.getUser()?.email ?? null;

  readonly #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);
  readonly #fileSyncTracker = inject(IrFileSyncTrackerService);
  readonly #uploadService = inject(InformationRequestUploadService);
  readonly #service = inject(InformationRequestsService);
  readonly #partnerService = inject(PartnerService);
  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #dialogService = inject(IgntDialogService);
  readonly #createPlanService = inject(CreateMainPlanService);
  readonly #projectsService = inject(ProjectsService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  protected readonly Permissions = Permissions;
  readonly creatingPlan = signal<boolean>(false);
  readonly isLifecycleUpdating = signal<boolean>(false);
  readonly #createPlanCancelled$ = new Subject<void>();
  readonly #fieldCatalogCancelled$ = new Subject<void>();
  readonly createPlanErrorKey = signal<CreatePlanErrorKey | null>(null);
  readonly createdPlanId = signal<number | null>(null);
  protected readonly canEvaluate = computed<boolean>(
    () =>
      this.request()?.status === InformationRequestStatus.SUBMITTED &&
      this.#userService.hasPermission(Permissions.CAN_ADMIN_INFORMATION_REQUEST),
  );

  readonly canCreatePlan = computed<boolean>(() => {
    const ir = this.request();
    if (!ir || ir.templateKey !== MAIN_EVENT_REQUEST_TEMPLATE_KEY) {
      return false;
    }
    if (this.createdPlanId() !== null) {
      return false;
    }
    if (ir.status === InformationRequestStatus.APPROVED || ir.status === InformationRequestStatus.REJECTED) {
      return false;
    }
    if (this.dirty() || this.#optimizely.isFeatureEnabled(FeatureFlags.CREATE_PLAN_FROM_INFORMATION_REQUEST) !== true) {
      return false;
    }
    return this.#answersComplete();
  });

  #formValueSubscription: Subscription | null = null;
  readonly #pendingFileUploads = new Set<string>();
  /** File-answer keys already merged into a control once — never merged again (see mergeUploadedFileAnswers). */
  readonly #mergedUploadKeys = new Set<string>();
  readonly #syncPoll$ = new Subject<number>();
  readonly #initialImportsRequest$ = new Subject<{ launchId: string; partnerId: number; requestId: string }>();
  #initialImports: { imports: DriveLinkImport[] | null; requestId: string } | null = null;
  #idleSyncPolls = 0;
  #applyingServerAnswers = false;
  #forcedSyncPoll = false;
  #forcedSyncPollRequested = false;
  #submitAcceptedRequestId: string | null = null;

  constructor() {
    this.#syncPoll$
      .pipe(
        debounceTime(InformationRequestDetailComponent.uploadRefreshDebounceMs),
        switchMap(initialDelayMs =>
          defer(() => {
            this.#forcedSyncPoll = this.#forcedSyncPoll || this.#forcedSyncPollRequested;
            this.#forcedSyncPollRequested = false;
            return ticksWhileVisible(this.#document, initialDelayMs, InformationRequestDetailComponent.syncPollIntervalMs);
          }).pipe(
            takeWhile(() => this.#hasPendingSyncWork()),
            exhaustMap(() => {
              const finishedAtLoad = this.#fileSyncTracker.importJobIdsFinishedAtLoad();
              return this.#fetchRequestForSync$().pipe(map(result => ({ finishedAtLoad, result })));
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ finishedAtLoad, result }) => this.#applySyncedAnswers(result, finishedAtLoad));

    this.#initialImportsRequest$
      .pipe(
        switchMap(({ launchId, partnerId, requestId }) =>
          this.#fetchDriveLinkImports$(partnerId, launchId, requestId).pipe(map(imports => ({ imports, requestId }))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(loaded => {
        this.#initialImports = loaded;
        this.#applyInitialImports();
      });

    combineLatest([
      this.#partnerService.observePartner().pipe(filter((partner): partner is Partner => partner !== null)),
      this.#activatedRoute.paramMap,
    ])
      .pipe(
        switchMap(([partner, params]) => {
          this.#createPlanCancelled$.next();
          this.creatingPlan.set(false);
          this.createPlanErrorKey.set(null);
          this.createdPlanId.set(null);
          this.loading.set(true);
          this.error.set(null);
          this.partnerId.set(partner.id);
          this.#resetFieldEditor();
          const launchId = this.#activatedRoute.parent?.snapshot.paramMap.get('projectId') ?? '';
          this.launchId.set(launchId);
          const requestId = params.get('requestId') ?? '';
          this.#initialImports = null;
          this.#initialImportsRequest$.next({ launchId, partnerId: partner.id, requestId });
          return this.#service
            .get(partner.id, launchId, requestId)
            .pipe(switchMap(response => this.#withTemplateSections(response, partner.id)));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => {
          this.loading.set(false);
          this.error.set('loadFailed');
          this.request.set(null);
        },
        next: (response: BaseResponse<InformationRequest | null>) => {
          this.loading.set(false);
          if (response.error) {
            this.error.set(this.#mapErrorKey(response.error));
            this.request.set(null);
            return;
          }
          if (!response.data) {
            this.error.set('notFound');
            this.request.set(null);
            return;
          }
          this.#pendingFileUploads.clear();
          this.#mergedUploadKeys.clear();
          this.#fileSyncTracker.reset();
          this.#setRequest(withBuiltInStepperTemplates(response.data));
          this.dirty.set(false);
          this.createdPlanId.set(response.data.mainPlanId ?? null);
          this.#applyInitialImports();
        },
      });
  }

  canDeactivate(): boolean | Observable<boolean> {
    if (!this.hasUnsavedWork()) {
      return true;
    }
    return this.#dialogService.openModal<UnsavedChangesExitChoice>(UnsavedChangesExitDialogComponent, { size: 'sm' }).closed$.pipe(
      take(1),
      switchMap(choice => {
        if (choice === 'discard') {
          return of(true);
        }
        if (choice === 'save') {
          const complete = this.#answersComplete();
          return this.#flushAnswers$().pipe(
            switchMap(ok => (ok ? this.#saveFieldConfig$() : of(false))),
            switchMap(ok => (ok ? this.#submitIfComplete$(complete) : of(false))),
            switchMap(ok => (ok ? this.#saveAlertConfig$() : of(false))),
          );
        }
        return of(false);
      }),
    );
  }

  canManageAlerts(): boolean {
    return this.#canCreate() && !this.isCancelled();
  }

  /**
   * Whether the alerts card renders at all. A cancelled request keeps it visible but read-only —
   * gating the card itself on `canManageAlerts()` would hide who was configured to be alerted.
   */
  canViewAlerts(): boolean {
    return this.#canCreate();
  }

  #canCreate(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_CREATE_INFORMATION_REQUEST) &&
      this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) === true
    );
  }

  /**
   * Mirrors the authorization on the endpoints these actions call, which are guarded by
   * `partner_that(["can_admin_hub_project_management_information_request"])`. Gating on the create
   * permission instead would show the button to users the backend then rejects with a 403.
   */
  #canAdminLifecycle(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_ADMIN_INFORMATION_REQUEST) &&
      this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) === true
    );
  }

  canSubmit(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_SUBMIT_INFORMATION_REQUEST) &&
      this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) === true
    );
  }

  closeAlertsEditor(): void {
    this.editingAlerts.set(false);
    this.alertsSaveError.set(false);
  }

  createPlan(): void {
    const ir = this.request();
    const partnerId = this.partnerId();
    if (!ir || partnerId === null || this.creatingPlan() || !this.canCreatePlan()) {
      return;
    }
    this.creatingPlan.set(true);
    this.createPlanErrorKey.set(null);
    this.#createPlanService
      .createMainPlanFromInformationRequest(partnerId, ir.id)
      .pipe(takeUntil(this.#createPlanCancelled$), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.creatingPlan.set(false);
          this.createPlanErrorKey.set('generic');
        },
        next: response => {
          this.creatingPlan.set(false);
          if (response.error || !response.data?.main_plan_id) {
            this.createPlanErrorKey.set(this.#mapCreatePlanErrorKey(response.error?.code));
            return;
          }
          const planId = response.data.main_plan_id;
          this.createdPlanId.set(planId);
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant('informationRequests.detail.createPlanSuccess', { id: planId }),
            sentiment: AlertSentiment.positive,
          });
        },
      });
  }

  hasAlertEdits(): boolean {
    return this.editingAlerts() && this.alertConfigControl.dirty;
  }

  hasUnsavedWork(): boolean {
    return this.dirty() || this.hasAlertEdits() || this.hasFieldEdits();
  }

  canEditFields(): boolean {
    return this.#canCreate() && this.request()?.status === InformationRequestStatus.PENDING;
  }

  showsAnswers(): boolean {
    const request = this.request();
    if (this.#quickSetupFromIr && request?.templateKey === MAIN_EVENT_REQUEST_TEMPLATE_KEY) {
      return false;
    }
    return (request?.questions?.length ?? 0) > 0 || this.canEditFields();
  }

  enterFieldEditing(): void {
    const ir = this.request();
    const partnerId = this.partnerId();
    if (!ir || partnerId === null || !this.canEditFields() || this.editingFields()) {
      return;
    }
    if (this.dirty()) {
      this.#toastService.addError(this.#translateService.instant('informationRequests.detail.fieldConfig.saveAnswersFirst'));
      return;
    }
    this.#resetFieldEdits();
    if (!ir.templateKey || this.templateSummary() !== null) {
      this.#startFieldEditing();
      return;
    }
    this.#loadFieldCatalog(partnerId, ir.templateKey, () => this.#startFieldEditing());
  }

  exitFieldEditing(): void {
    if (!this.hasFieldEdits()) {
      this.#stopFieldEditing();
      return;
    }
    this.#dialogService
      .openConfirmModal(
        this.#translateService.instant('informationRequests.detail.fieldConfig.discardDialog.title'),
        this.#translateService.instant('informationRequests.detail.fieldConfig.discardDialog.message'),
        { isDestructive: true },
      )
      .closed$.pipe(
        filter(confirmed => confirmed === true),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => this.#stopFieldEditing());
  }

  saveFieldConfig(): void {
    if (this.savingFields()) {
      return;
    }
    this.#saveFieldConfig$().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  retryFieldCatalog(): void {
    const ir = this.request();
    const partnerId = this.partnerId();
    if (!ir?.templateKey || partnerId === null) {
      return;
    }
    this.#loadFieldCatalog(partnerId, ir.templateKey, () => this.#startFieldEditing());
  }

  hasFieldEdits(): boolean {
    return hasPendingFieldEdits(this.fieldEditingState());
  }

  onFieldAction(action: IrFieldAction): void {
    switch (action.type) {
      case 'required':
        this.#setPendingRequired(action.questionId, action.required === true);
        break;
      case 'remove':
        this.#confirmRemoval(action.questionId);
        break;
      case 'undoRemove':
        this.pendingRemove.set(this.pendingRemove().filter(id => id !== action.questionId));
        break;
      case 'add':
        if (!this.pendingAdd().includes(action.questionId)) {
          this.pendingAdd.set([...this.pendingAdd(), action.questionId]);
        }
        break;
      case 'undoAdd':
        this.pendingAdd.set(this.pendingAdd().filter(id => id !== action.questionId));
        this.#clearPendingRequired(action.questionId);
        break;
    }
  }

  #startFieldEditing(): void {
    this.editingFields.set(true);
    this.#applyFormDisabledState();
  }

  #stopFieldEditing(): void {
    this.editingFields.set(false);
    this.#resetFieldEdits();
    this.#applyFormDisabledState();
  }

  #setPendingRequired(questionId: string, required: boolean): void {
    const question = this.#questionForFieldEditing(questionId);
    const pending = { ...this.pendingRequired() };
    if (question !== null && question.required === required) {
      delete pending[questionId];
    } else {
      pending[questionId] = required;
    }
    this.pendingRequired.set(pending);
  }

  /** Requirement changes that still describe a question the request will keep. */
  #reportableRequired(): Record<string, boolean> {
    const excluded = new Set([...this.pendingAdd(), ...this.pendingRemove()]);
    return Object.fromEntries(Object.entries(this.pendingRequired()).filter(([id]) => !excluded.has(id)));
  }

  #sendableRequired(): Record<string, boolean> {
    const removed = new Set(this.pendingRemove());
    return Object.fromEntries(Object.entries(this.pendingRequired()).filter(([id]) => !removed.has(id)));
  }

  #clearPendingRequired(questionId: string): void {
    const pending = { ...this.pendingRequired() };
    delete pending[questionId];
    this.pendingRequired.set(pending);
  }

  #questionForFieldEditing(questionId: string): InformationRequestQuestion | null {
    const onRequest = (this.request()?.questions ?? []).find(question => question.id === questionId);
    return onRequest ?? this.#catalogQuestion(questionId);
  }

  #confirmRemoval(questionId: string): void {
    const question = this.#questionForFieldEditing(questionId);
    if (question === null || this.pendingRemove().includes(questionId)) {
      return;
    }
    const messageKey = this.#catalogQuestion(questionId)
      ? 'informationRequests.detail.fieldConfig.removeDialog.message'
      : 'informationRequests.detail.fieldConfig.removeDialog.messageIrreversible';
    this.#dialogService
      .openConfirmModal(
        this.#translateService.instant('informationRequests.detail.fieldConfig.removeDialog.title'),
        this.#translateService.instant(messageKey, { label: question.label }),
        { isDestructive: true },
      )
      .closed$.pipe(
        filter(confirmed => confirmed === true),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => this.pendingRemove.set([...this.pendingRemove(), questionId]));
  }

  #catalogQuestion(questionId: string): InformationRequestQuestion | null {
    return this.templateSummary()?.questions.find(question => question.id === questionId) ?? null;
  }

  #loadFieldCatalog(partnerId: number, templateKey: string, onReady?: () => void): void {
    this.loadingFieldCatalog.set(true);
    this.fieldCatalogFailed.set(false);
    this.#service
      .listTemplates(partnerId)
      .pipe(takeUntil(this.#fieldCatalogCancelled$), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.loadingFieldCatalog.set(false);
          this.fieldCatalogFailed.set(true);
        },
        next: response => {
          this.loadingFieldCatalog.set(false);
          if (response.error) {
            this.fieldCatalogFailed.set(true);
            return;
          }
          this.templateSummary.set(response.data?.find(summary => summary.key === templateKey) ?? null);
          onReady?.();
        },
      });
  }

  #resetFieldEditor(): void {
    this.#fieldCatalogCancelled$.next();
    this.editingFields.set(false);
    this.savingFields.set(false);
    this.loadingFieldCatalog.set(false);
    this.templateSummary.set(null);
    this.#resetFieldEdits();
  }

  #resetFieldEdits(): void {
    this.pendingRequired.set({});
    this.pendingAdd.set([]);
    this.pendingRemove.set([]);
    this.fieldsErrorKey.set(null);
    this.fieldCatalogFailed.set(false);
  }

  #saveFieldConfig$(): Observable<boolean> {
    const ir = this.request();
    const partnerId = this.partnerId();
    if (!ir || partnerId === null || !this.hasFieldEdits()) {
      return of(true);
    }
    if (this.dirty()) {
      this.#toastService.addError(this.#translateService.instant('informationRequests.detail.fieldConfig.saveAnswersFirst'));
      return of(false);
    }
    this.savingFields.set(true);
    this.fieldsErrorKey.set(null);
    this.#applyFormDisabledState();
    const required = this.#sendableRequired();
    const payload: FieldConfigPayload = {
      ...(this.pendingAdd().length ? { add: this.pendingAdd() } : {}),
      ...(this.pendingRemove().length ? { remove: this.pendingRemove() } : {}),
      ...(Object.keys(required).length ? { required } : {}),
    };
    return this.#service.updateFieldConfig(partnerId, ir.id, payload).pipe(
      map(response => {
        this.savingFields.set(false);
        this.#applyFormDisabledState();
        if (response.error) {
          const key = FIELD_CONFIG_ERROR_KEY_BY_CODE[String(response.error.code)] ?? 'generic';
          this.fieldsErrorKey.set(key);
          if (key === 'notEditable') {
            this.#refreshRequest(partnerId, ir.id);
          }
          return false;
        }
        this.#stopFieldEditing();
        this.#mergedUploadKeys.clear();
        this.#toastService.addSuccess(this.#translateService.instant('informationRequests.detail.fieldConfig.saveSuccess'));
        this.#refreshRequest(partnerId, ir.id, { preserveForm: false });
        return true;
      }),
      catchError(() => {
        this.savingFields.set(false);
        this.#applyFormDisabledState();
        this.fieldsErrorKey.set('generic');
        return of(false);
      }),
    );
  }

  formLocked(): boolean {
    return !this.isEditable() || this.saving() || this.savingFields() || this.editingFields();
  }

  isEditable(): boolean {
    const ir = this.request();
    return (
      this.canSubmit() &&
      !!ir &&
      ir.status !== InformationRequestStatus.APPROVED &&
      ir.status !== InformationRequestStatus.REJECTED &&
      ir.status !== InformationRequestStatus.CANCELLED
    );
  }

  isCancelled(): boolean {
    return this.request()?.status === InformationRequestStatus.CANCELLED;
  }

  canEditAiDeclaration(): boolean {
    return this.isEditable();
  }

  aiDeclarationBusy(): boolean {
    return this.saving() || this.savingAiDeclaration();
  }

  onAiGeneratedToggle(aiGenerated: boolean): void {
    const ir = this.request();
    const partnerId = this.partnerId();
    if (!ir || partnerId === null || this.aiDeclarationBusy() || aiGenerated === ir.aiGenerated) {
      return;
    }
    const requestId = ir.id;
    const previous = ir.aiGenerated;
    this.savingAiDeclaration.set(true);
    this.aiDeclarationError.set(false);
    this.request.set({ ...ir, aiGenerated });
    this.#service
      .updateAnswers(partnerId, this.launchId(), requestId, [], [], this.currentUserEmail, aiGenerated)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          this.savingAiDeclaration.set(false);
          if (response.error) {
            this.#revertAiGenerated(requestId, previous);
          }
        },
        error: () => {
          this.savingAiDeclaration.set(false);
          this.#revertAiGenerated(requestId, previous);
        },
      });
  }

  #revertAiGenerated(requestId: string, aiGenerated: boolean): void {
    const latest = this.request();
    if (!latest || latest.id !== requestId) {
      return;
    }
    this.aiDeclarationError.set(true);
    this.request.set({ ...latest, aiGenerated });
  }

  /** Mirrors the backend's cancellable states; other statuses offer no cancel/reactivate action. */
  canCancel(): boolean {
    const status = this.request()?.status;
    return (
      this.#canAdminLifecycle() && (status === InformationRequestStatus.PENDING || status === InformationRequestStatus.CHANGES_REQUESTED)
    );
  }

  canReactivate(): boolean {
    return this.#canAdminLifecycle() && this.isCancelled();
  }

  cancel(): void {
    this.#confirmLifecycleChange('cancel');
  }

  protected evaluate(): void {
    if (!this.canEvaluate()) {
      return;
    }
    void this.#router.navigate(['evaluate'], { relativeTo: this.#activatedRoute });
  }

  reactivate(): void {
    this.#confirmLifecycleChange('reactivate');
  }

  #confirmLifecycleChange(action: 'cancel' | 'reactivate'): void {
    const ir = this.request();
    const partnerId = this.partnerId();
    if (!ir || partnerId === null || this.isLifecycleUpdating()) {
      return;
    }
    this.#dialogService
      .openConfirmModal(
        this.#translateService.instant(`informationRequests.detail.${action}Dialog.title`),
        this.#translateService.instant(`informationRequests.detail.${action}Dialog.message`),
        { isDestructive: action === 'cancel' },
      )
      .closed$.pipe(
        filter(confirmed => confirmed === true),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => this.#applyLifecycleChange(action, partnerId, ir.id));
  }

  #applyLifecycleChange(action: 'cancel' | 'reactivate', partnerId: number, requestId: string): void {
    this.isLifecycleUpdating.set(true);
    const request$ = action === 'cancel' ? this.#service.cancel(partnerId, requestId) : this.#service.reactivate(partnerId, requestId);
    request$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: () => {
        this.isLifecycleUpdating.set(false);
        this.#showLifecycleError(action);
      },
      next: response => {
        this.isLifecycleUpdating.set(false);
        // The projects list is cached and its pending-action counters are derived server-side from
        // the request's status, so that cache has to be dropped whenever the status may have moved.
        // That covers both outcomes here: a success moved it ourselves, and a rejection means the
        // status had already moved underneath us — so the cached counters are suspect either way.
        this.#projectsService.invalidate(partnerId);
        if (response.error) {
          this.#showLifecycleError(action, response.error.code);
          this.#refreshRequest(partnerId, requestId);
          return;
        }
        if (action === 'cancel') {
          this.#discardUnsavedWork();
        }
        this.#toastService.addSuccess(this.#translateService.instant(`informationRequests.detail.${action}Success`));
        this.#refreshRequest(partnerId, requestId);
      },
    });
  }

  /**
   * A cancelled request is read-only and the backend rejects every mutation on it, so unsaved edits
   * can never be saved again. Drop them, otherwise the exit guard keeps offering a "Save" that
   * always fails — and because a failed save resolves canDeactivate to false, it traps the user on
   * the page.
   */
  #discardUnsavedWork(): void {
    this.form.markAsPristine();
    this.#pendingFileUploads.clear();
    this.editingAlerts.set(false);
    this.alertConfigControl.markAsPristine();
    this.#syncDirty();
  }

  /**
   * A cancelled request renders its alert config read-only, so seed the control from the server and
   * disable it. Reactivating re-enables it for the normal edit flow.
   */
  #syncAlertConfigAccess(ir: InformationRequest): void {
    if (ir.status === InformationRequestStatus.CANCELLED) {
      this.alertConfigControl.setValue(fromAlertConfigPayload(ir.alertConfig), { emitEvent: false });
      this.alertConfigControl.disable({ emitEvent: false });
      return;
    }
    this.alertConfigControl.enable({ emitEvent: false });
  }

  #showLifecycleError(action: 'cancel' | 'reactivate', code?: string | number): void {
    const key =
      code === 'illegal_status_transition' ? `informationRequests.detail.${action}Conflict` : `informationRequests.detail.${action}Failed`;
    this.#toastService.addError(this.#translateService.instant(key));
  }

  notifiesPmsOnSave(): boolean {
    return this.isEditable();
  }

  onActiveSectionChange(section: string | null): void {
    this.activeSection.set(section);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedWork()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  onFileUploaded(questionId: string): void {
    this.#pendingFileUploads.add(questionId);
    this.saveError.set(false);
    this.#syncDirty();
    this.#requestSyncPoll(0);
  }

  onTabChange(index: number): void {
    this.activeTabIndex.set(index);
  }

  openAlertsEditor(): void {
    const ir = this.request();
    if (!ir) return;
    this.alertConfigControl.setValue(fromAlertConfigPayload(ir.alertConfig));
    this.alertsSaveError.set(false);
    this.editingAlerts.set(true);
  }

  save(): void {
    this.#saveQuestions();
  }

  saveAlertConfig(): void {
    const ir = this.request();
    const partnerId = this.partnerId();
    if (!ir || partnerId === null || this.savingAlerts() || !this.isAlertConfigDirectoryLoaded()) return;
    const payload = toAlertConfigPayload(this.alertConfigControl.value) ?? {};
    this.savingAlerts.set(true);
    this.alertsSaveError.set(false);
    this.#service
      .updateAlertConfig(partnerId, ir.id, payload)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.savingAlerts.set(false);
          this.alertsSaveError.set(true);
        },
        next: response => {
          this.savingAlerts.set(false);
          if (response.error) {
            this.alertsSaveError.set(true);
            return;
          }
          this.editingAlerts.set(false);
          this.#refreshRequest(partnerId, ir.id);
        },
      });
  }

  protected statusLabelKey(status: InformationRequestStatus): string {
    return informationRequestStatusLabelKey(status);
  }

  statusTagSentiment(status: InformationRequestStatus): TagSentiment {
    switch (status) {
      case InformationRequestStatus.APPROVED:
      case InformationRequestStatus.COMPLETED:
        return 'positive';
      case InformationRequestStatus.REJECTED:
        return 'danger';
      case InformationRequestStatus.IN_REVIEW:
      case InformationRequestStatus.CHANGES_REQUESTED:
        return 'warning';
      case InformationRequestStatus.SUBMITTED:
        return 'info';
      case InformationRequestStatus.CANCELLED:
        return 'disable';
      default:
        return 'disable';
    }
  }

  #answersComplete(): boolean {
    const ir = this.request();
    const questions = ir?.questions ?? [];
    if (questions.length === 0) {
      return false;
    }
    const answers = buildAnswersSnapshot(questions, this.form, { referencedStepperTemplates: ir?.referencedStepperTemplates ?? {} });
    return isInformationRequestComplete(questions, answers, this.#pendingFileUploads);
  }

  #applyDriveLinkImports(imports: readonly DriveLinkImport[]): boolean {
    return this.#fileSyncTracker.applyImports(imports, (questionId, importJobId) => this.#knownFileKeys(questionId).has(importJobId));
  }

  #applyFormDisabledState(): void {
    if (!this.formLocked()) {
      this.form.enable({ emitEvent: false });
    } else {
      this.form.disable({ emitEvent: false });
    }
  }

  #applyInitialImports(): void {
    const loaded = this.#initialImports;
    if (!loaded || loaded.requestId !== this.request()?.id) {
      return;
    }
    this.#initialImports = null;
    if (loaded.imports) {
      this.#fileSyncTracker.applyInitialImports(loaded.imports, (questionId, importJobId) =>
        this.#knownFileKeys(questionId).has(importJobId),
      );
    }
    this.#requestSyncPoll(InformationRequestDetailComponent.syncPollIntervalMs);
  }

  #flushAnswers$(questions?: readonly InformationRequestQuestion[]): Observable<boolean> {
    const ir = this.request();
    const partnerId = this.partnerId();
    const scopedQuestionIds = questions ? new Set(questions.map(question => question.id)) : null;
    const dirtyIds = Object.keys(this.form.controls).filter(
      id => (!scopedQuestionIds || scopedQuestionIds.has(id)) && this.form.get(id)?.dirty,
    );
    const uploadedFileQuestionIds = Array.from(this.#pendingFileUploads).filter(id => !scopedQuestionIds || scopedQuestionIds.has(id));
    const hasWork = dirtyIds.length > 0 || uploadedFileQuestionIds.length > 0;
    if (!ir || partnerId === null || !hasWork || this.saving() || this.savingAiDeclaration()) {
      return of(!hasWork);
    }
    const serializedAnswers = buildAnswersSnapshot(questions ?? ir.questions ?? [], this.form, {
      referencedStepperTemplates: ir.referencedStepperTemplates ?? {},
    });
    const answers: UpdateAnswerPayload[] = dirtyIds.map(question_id => ({
      question_id,
      value: question_id in serializedAnswers ? serializedAnswers[question_id] : this.form.get(question_id)?.getRawValue(),
    }));
    this.#setSaving(true);
    this.saveError.set(false);
    return this.#service.updateAnswers(partnerId, this.launchId(), ir.id, answers, uploadedFileQuestionIds, this.currentUserEmail).pipe(
      tap(response => {
        this.#setSaving(false);
        if (response.error) {
          this.saveError.set(true);
          return;
        }
        for (const id of dirtyIds) this.form.get(id)?.markAsPristine();
        for (const questionId of uploadedFileQuestionIds) this.#pendingFileUploads.delete(questionId);
        this.#syncDirty();
        this.#requestSyncPoll(0, { force: true });
      }),
      map(response => !response.error),
      catchError(() => {
        this.#setSaving(false);
        this.saveError.set(true);
        return of(false);
      }),
    );
  }

  #mapCreatePlanErrorKey(code: number | string | undefined): CreatePlanErrorKey {
    if (typeof code === 'string' && code in CREATE_PLAN_ERROR_KEY_BY_CODE) {
      return CREATE_PLAN_ERROR_KEY_BY_CODE[code];
    }
    if (code === 409 || code === '409') {
      return 'incomplete';
    }
    if (code === 404 || code === '404') {
      return 'notFound';
    }
    return 'generic';
  }

  #mapErrorKey(error: { code: string | number }): DetailErrorKey {
    if (error.code === 403 || error.code === '403') {
      return 'forbidden';
    }
    if (error.code === 404 || error.code === '404') {
      return 'notFound';
    }
    return 'loadFailed';
  }

  #refreshRequest(partnerId: number, requestId: string, options?: { preserveForm?: boolean }): void {
    this.#service
      .get(partnerId, this.launchId(), requestId)
      .pipe(
        switchMap(response => this.#withTemplateSections(response, partnerId)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(response => {
        if (!response.error && response.data) {
          const preserveForm = options?.preserveForm ?? this.form.dirty;
          this.#setRequest(withBuiltInStepperTemplates(response.data), { preserveForm });
          if (!preserveForm) {
            this.#syncDirty();
          }
        }
      });
  }

  #fetchDriveLinkImports$(partnerId: number, launchId: string, requestId: string): Observable<DriveLinkImport[] | null> {
    return this.#uploadService.listDriveLinkImports(partnerId, launchId, requestId).pipe(
      map(response => (response.error ? null : response.data)),
      catchError(() => of(null)),
    );
  }

  #fetchRequestForSync$(): Observable<InformationRequestWithDriveLinkImports | null> {
    const ir = this.request();
    const partnerId = this.partnerId();
    if (!ir || partnerId === null) {
      return of(null);
    }
    return forkJoin({
      imports: this.#fileQuestions(ir).length > 0 ? this.#fetchDriveLinkImports$(partnerId, this.launchId(), ir.id) : of(null),
      response: this.#service.get(partnerId, this.launchId(), ir.id),
    }).pipe(catchError(() => of(null)));
  }

  #requestSyncPoll(initialDelayMs: number, options?: { force?: boolean }): void {
    this.#idleSyncPolls = 0;
    this.#fileSyncTracker.releaseStalledFiles();
    if (options?.force) {
      this.#forcedSyncPollRequested = true;
    }
    if (options?.force || this.#hasPendingSyncWork()) {
      this.#syncPoll$.next(initialDelayMs);
    }
  }

  #hasPendingSyncWork(): boolean {
    if (this.#idleSyncPolls >= driveSyncPollMaxIdlePolls) {
      return false;
    }
    if (this.#forcedSyncPoll) {
      return true;
    }
    if (this.#fileSyncTracker.hasActiveWork()) {
      return true;
    }
    return this.#savedSyncingAnswers().length > 0;
  }

  #savedSyncingAnswers(): InformationRequestFileAnswer[] {
    return this.#fileQuestions(this.request()).flatMap(question =>
      this.#fileAnswersOf(this.form.get(question.id)?.value).filter(answer => {
        if (!isFileAnswerSyncing(answer)) {
          return false;
        }
        if (this.#fileSyncTracker.isDriveLinkFile(answer)) {
          return true;
        }
        return !this.#pendingFileUploads.has(question.id) && !isFileAnswerAwaitingSave(answer);
      }),
    );
  }

  /**
   * Pulls fresh server file answers into their controls so uploads and Drive syncs render without
   * a manual reload (see mergeUploadedFileAnswers). A response for a different request (stale
   * fetch racing a navigation) is discarded. Polls that move nothing count towards an idle limit
   * that ends the polling and gives up on imports still queued.
   */
  #applySyncedAnswers(result: InformationRequestWithDriveLinkImports | null, finishedAtLoad: ReadonlySet<string>): void {
    const response = result?.response;
    if (!result || !response?.data || response.error || response.data.id !== this.request()?.id) {
      this.#recordSyncPoll(false);
      return;
    }
    const imports = result.imports;
    this.#forcedSyncPoll = false;
    let moved = imports ? this.#applyDriveLinkImports(imports) : false;
    for (const question of this.#fileQuestions(response.data)) {
      const control = this.form.get(question.id);
      if (!control) {
        continue;
      }
      const merged = mergeUploadedFileAnswers(
        question.type,
        control.value,
        question.answer,
        answer => !this.#wasMergedBefore(answer) && this.#fileSyncTracker.accepts(answer),
      );
      if (!merged.changed) {
        continue;
      }
      for (const answer of merged.added) {
        this.#mergedUploadKeys.add(fileAnswerKey(answer));
        if (answer.importJobId) {
          this.#mergedUploadKeys.add(answer.importJobId);
        }
      }
      this.#applyingServerAnswers = true;
      control.setValue(merged.value);
      this.#applyingServerAnswers = false;
      this.#fileSyncTracker.acknowledge(merged.added);
      moved = true;
    }
    this.#fileSyncTracker.settleImportsFinishedAtLoad(finishedAtLoad);
    this.#recordSyncPoll(moved);
  }

  #recordSyncPoll(moved: boolean): void {
    this.#idleSyncPolls = moved ? 0 : this.#idleSyncPolls + 1;
    if (this.#idleSyncPolls >= driveSyncPollMaxIdlePolls) {
      this.#fileSyncTracker.stallPendingWork();
      this.#fileSyncTracker.stallFiles(this.#savedSyncingAnswers());
    }
  }

  #wasMergedBefore(answer: InformationRequestFileAnswer): boolean {
    return this.#mergedUploadKeys.has(fileAnswerKey(answer)) || (!!answer.importJobId && this.#mergedUploadKeys.has(answer.importJobId));
  }

  #knownFileKeys(questionId: string): Set<string> {
    const serverAnswer = this.request()?.questions?.find(question => question.id === questionId)?.answer;
    const answers = [...this.#fileAnswersOf(serverAnswer), ...this.#fileAnswersOf(this.form.get(questionId)?.value)];
    return new Set([
      ...this.#mergedUploadKeys,
      ...answers.flatMap(answer => [fileAnswerKey(answer), answer.importJobId ?? '']).filter(key => key !== ''),
    ]);
  }

  #fileQuestions(ir: InformationRequest | null): InformationRequestQuestion[] {
    return (ir?.questions ?? []).filter(
      question => question.type === InformationRequestQuestionType.FILE || question.type === InformationRequestQuestionType.MULTIFILE,
    );
  }

  #fileAnswersOf(value: unknown): InformationRequestFileAnswer[] {
    if (Array.isArray(value)) {
      return value as InformationRequestFileAnswer[];
    }
    return value && typeof value === 'object' ? [value as InformationRequestFileAnswer] : [];
  }

  #saveAlertConfig$(): Observable<boolean> {
    const ir = this.request();
    const partnerId = this.partnerId();
    if (!this.hasAlertEdits() || !ir || partnerId === null) {
      return of(true);
    }
    if (!this.isAlertConfigDirectoryLoaded()) {
      this.alertsSaveError.set(true);
      return of(false);
    }
    const payload = toAlertConfigPayload(this.alertConfigControl.value) ?? {};
    return this.#service.updateAlertConfig(partnerId, ir.id, payload).pipe(
      map(response => !response.error),
      catchError(() => of(false)),
    );
  }

  #saveQuestions(questions?: readonly InformationRequestQuestion[]): void {
    const complete = this.#answersComplete();
    this.#flushAnswers$(questions)
      .pipe(
        switchMap(saved => (saved ? this.#submitIfComplete$(complete) : of(false))),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #setRequest(ir: InformationRequest, options?: { preserveForm?: boolean }): void {
    this.request.set(ir);
    this.#syncAlertConfigAccess(ir);
    if (!options?.preserveForm) {
      this.#formValueSubscription?.unsubscribe();
      this.form = buildAnswersForm(ir.questions ?? [], { referencedStepperTemplates: ir.referencedStepperTemplates ?? {} });
      this.#formValueSubscription = this.form.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        if (!this.#applyingServerAnswers) {
          this.saveError.set(false);
        }
        this.#syncDirty();
      });
    }
    this.#applyFormDisabledState();
    this.#requestSyncPoll(InformationRequestDetailComponent.syncPollIntervalMs);
  }

  #setSaving(saving: boolean): void {
    this.saving.set(saving);
    this.#applyFormDisabledState();
  }

  #submitIfComplete$(complete: boolean): Observable<boolean> {
    const ir = this.request();
    const partnerId = this.partnerId();
    if (!ir || partnerId === null) {
      return of(true);
    }
    const unsavedWork = this.form.dirty || this.#pendingFileUploads.size > 0;
    if (!complete || unsavedWork || !this.isEditable() || this.#isAlreadySubmitted(ir)) {
      return of(true);
    }
    this.#setSaving(true);
    this.saveError.set(false);
    return this.#service.submit(partnerId, this.launchId(), ir.id, this.currentUserEmail).pipe(
      switchMap(response => {
        // Same rule as every other status-changing path here: drop the cached projects list whichever
        // way this landed, because a rejection usually means the status already moved underneath us.
        this.#projectsService.invalidate(partnerId);
        if (response.error) {
          this.#setSaving(false);
          this.saveError.set(true);
          return of(false);
        }
        this.#submitAcceptedRequestId = ir.id;
        return this.#readSubmittedStatus$(partnerId, ir.id);
      }),
      catchError(() => {
        this.#setSaving(false);
        this.saveError.set(true);
        return of(false);
      }),
    );
  }

  #isAlreadySubmitted(ir: InformationRequest): boolean {
    return (
      this.#submitAcceptedRequestId === ir.id ||
      ir.status === InformationRequestStatus.SUBMITTED ||
      ir.status === InformationRequestStatus.COMPLETED
    );
  }

  #readSubmittedStatus$(partnerId: number, requestId: string): Observable<boolean> {
    return this.#service.get(partnerId, this.launchId(), requestId).pipe(
      map(response => response.data?.status ?? null),
      catchError(() => of(null)),
      map(status => {
        if (status !== null) {
          this.request.update(current => (current?.id === requestId ? { ...current, status } : current));
        }
        this.#setSaving(false);
        return true;
      }),
    );
  }

  #syncDirty(): void {
    this.dirty.set(this.form.dirty || this.#pendingFileUploads.size > 0);
  }

  #withTemplateSections(
    response: BaseResponse<InformationRequest | null>,
    partnerId: number,
  ): Observable<BaseResponse<InformationRequest | null>> {
    const ir = response.error ? null : response.data;
    const templateKey = templateKeyToBackfill(ir);
    if (!ir || templateKey === null) {
      return of(response);
    }
    return this.#service.listTemplates(partnerId).pipe(
      map(templatesResponse => {
        const result = withTemplateSections(ir, templateKey, templatesResponse.error ? null : templatesResponse.data);
        this.templateSummary.set(result.template);
        return result.template ? new BaseResponse(result.request, response.error) : response;
      }),
      catchError(() => of(response)),
    );
  }
}
