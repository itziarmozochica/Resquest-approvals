import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AlertConfigFormComponent } from '@fz-original/app/modules/ir-approval/shared/components/alert-config-form/alert-config-form.component';
import { DescriptionPromptDialogComponent } from '@fz-original/app/modules/ir-approval/shared/components/description-prompt-dialog/description-prompt-dialog.component';
import { DriveFolderButtonComponent } from '@fz-original/app/modules/ir-approval/shared/components/drive-folder-button/drive-folder-button.component';
import { FzUploadComponent } from '@fz-original/app/modules/ir-approval/shared/components/fz-upload/fz-upload.component';
import { FzWizardStepperComponent } from '@fz-original/app/modules/ir-approval/shared/components/fz-wizard-stepper/fz-wizard-stepper.component';
import { UnsavedChangesExitDialogComponent } from '@fz-original/app/modules/ir-approval/shared/components/unsaved-changes-exit-dialog/unsaved-changes-exit-dialog.component';
import { AlertDirectories, FinalizeErrorMessage } from '@fz-original/app/modules/ir-approval/shared/models/alert-config-finalize.model';
import {
  AlertConfigFormValue,
  ApprovalValidationMode,
  createDefaultAlertConfig,
  DEFAULT_ALERT_CONFIG,
  supportsValidationMode,
  validationModeNeedsRecipient,
} from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';
import {
  DescriptionPromptDialogData,
  DescriptionPromptDialogResult,
} from '@fz-original/app/modules/ir-approval/shared/models/description-prompt-dialog.model';
import {
  FzDriveCommit,
  FzFileCommit,
  FzPreviewResolver,
  FzUploadItem,
  FzUploadResult,
} from '@fz-original/app/modules/ir-approval/shared/models/fz-upload.model';
import { WizardStepView } from '@fz-original/app/modules/ir-approval/shared/models/fz-wizard-stepper.model';
import { UnsavedChangesExitChoice } from '@fz-original/app/modules/ir-approval/shared/models/unsaved-changes-exit-dialog.model';
import { AlertConfigPrefetchService } from '@fz-original/app/modules/ir-approval/shared/services/alert-config-prefetch.service';
import {
  APPROVAL_UPLOAD_ACCEPT,
  APPROVAL_UPLOAD_FORMATS_LABEL,
  APPROVAL_UPLOAD_MIME_TYPES,
} from '@fz-original/app/modules/ir-approval/shared/upload/approval-upload-formats';
import {
  describeFinalizeError,
  resolveAlertRecipientDisplays,
} from '@fz-original/app/modules/ir-approval/shared/utils/alert-config-finalize.util';
import { toAlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/utils/alert-config-payload.util';
import { ProjectDriveFolder } from '@fz-original/app/modules/project-management/models/project-drive-folder.model';
import { Project } from '@fz-original/app/modules/project-management/models/project.model';
import { ProjectDriveFolderService } from '@fz-original/app/modules/project-management/services/project-drive-folder.service';
import { ProjectsService } from '@fz-original/app/modules/project-management/services/projects.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntButtonComponent, IgntDialogService } from '@ignite/common';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, skip, switchMap, take } from 'rxjs/operators';

import { LaunchPickerComponent } from '../../../information-requests/components/launch-picker/launch-picker.component';
import { ApprovalDriveFileTreeComponent } from '../../components/approval-drive-file-tree/approval-drive-file-tree.component';
import { ApprovalZiflowFolderPickerComponent } from '../../components/approval-ziflow-folder-picker/approval-ziflow-folder-picker.component';
import { SubtypePayloadEditorComponent } from '../../components/subtype-payload-editor/subtype-payload-editor.component';
import { isSheetBasedSubtype, isUrlBasedSubtype } from '../../components/subtype-payload-editor/subtype-payload-editor.types';
import {
  ApprovalSubtypePayloadFormGroup,
  buildSubtypePayloadForm,
  patchSubtypePayloadForm,
  resetSubtypePayloadForm,
  subtypePayloadValueFromForm,
} from '../../components/subtype-payload-editor/subtype-payload-form.util';
import { ApprovalDriveFileSelection, isApprovalDriveFileSelectionActive } from '../../models/approval-drive-file.model';
import { ApprovalAsset } from '../../models/approval.model';
import { ZiflowFolderSelection } from '../../models/ziflow-folder.model';
import { ApprovalAssetsService, DriveFileValidation } from '../../services/approval-assets.service';
import { ApprovalsService } from '../../services/approvals.service';
import { uploadedAssetRelativePaths } from '../../utils/approval-asset-relative-paths.util';
import { APPROVAL_TYPE_OPTIONS, ApprovalTypeOption, categorySelectsSubtypeAtType, subtypesForCategory } from './approval-new.catalog';
import { parseDriveUrl } from './approval-new.drive-url';
import { buildApprovalCreatePayload, isCampaignComplete, isConfigureComplete, parseDraftPayload } from './approval-new.payload';

type SubmitErrorKey = 'submitFailed';

export type WizardStep = 'project' | 'type' | 'campaign' | 'subtype' | 'configure' | 'alerts' | 'review';

interface ApprovalForm {
  title: FormControl<string>;
  category: FormControl<string>;
  subtype: FormControl<string>;
  description: FormControl<string>;
  dueDate: FormControl<string>;
  marketingRequestLink: FormControl<string>;
  specificCampaignName: FormControl<string>;
  specificCampaignStartDate: FormControl<string>;
  specificCampaignEndDate: FormControl<string>;
  subtypePayload: ApprovalSubtypePayloadFormGroup;
  assetIds: FormControl<string[]>;
  assetRelativePaths: FormControl<Record<string, string>>;
  driveFiles: FormControl<ApprovalDriveFileSelection[]>;
  alertConfig: FormControl<AlertConfigFormValue | null>;
  ziflowFolder: FormControl<string | null>;
  ziflowFolderThumbnail: FormControl<string | null>;
}

interface DrivePreflightSummary extends DriveFileValidation {
  driveFileId: string;
  rootUrl?: string | null;
  selectedChildDriveFileIds?: string[];
}

// Re-exported for callers/specs that referenced the previous single-page constant.
export { APPROVAL_CATEGORY_OPTIONS } from './approval-new.catalog';

@Component({
  selector: 'app-approval-new',
  templateUrl: './approval-new.component.html',
  styleUrls: ['./approval-new.component.scss'],
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslateModule,
    IgntButtonComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    IgntWrapperCardComponent,
    FzUploadComponent,
    DriveFolderButtonComponent,
    AlertConfigFormComponent,
    ApprovalDriveFileTreeComponent,
    ApprovalZiflowFolderPickerComponent,
    SubtypePayloadEditorComponent,
    FzWizardStepperComponent,
    LaunchPickerComponent,
  ],
  providers: [AlertConfigPrefetchService],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalNewComponent {
  readonly #fb = inject(FormBuilder).nonNullable;
  readonly form: FormGroup<ApprovalForm> = this.#fb.group<ApprovalForm>({
    title: this.#fb.control<string>('', { validators: [Validators.required] }),
    category: this.#fb.control<string>('', { validators: [Validators.required] }),
    subtype: this.#fb.control<string>('', { validators: [Validators.required] }),
    description: this.#fb.control<string>(''),
    dueDate: this.#fb.control<string>('', { validators: [Validators.required] }),
    marketingRequestLink: this.#fb.control<string>(''),
    specificCampaignName: this.#fb.control<string>(''),
    specificCampaignStartDate: this.#fb.control<string>(''),
    specificCampaignEndDate: this.#fb.control<string>(''),
    subtypePayload: buildSubtypePayloadForm(),
    assetIds: this.#fb.control<string[]>([]),
    assetRelativePaths: this.#fb.control<Record<string, string>>({}),
    driveFiles: this.#fb.control<ApprovalDriveFileSelection[]>([]),
    alertConfig: new FormControl<AlertConfigFormValue | null>(createDefaultAlertConfig()),
    ziflowFolder: new FormControl<string | null>(null),
    ziflowFolderThumbnail: new FormControl<string | null>(null),
  });

  readonly currentStep = signal<WizardStep>('type');
  readonly activeAssetTab = signal<number>(0);
  readonly submitting = signal<boolean>(false);
  readonly error = signal<SubmitErrorKey | null>(null);
  readonly skippedDriveFiles = signal<string[]>([]);
  readonly created = signal<boolean>(false);
  readonly partnerId = signal<number | null>(null);
  readonly launchId = signal<string>('');
  readonly isStandalone = signal<boolean>(false);
  readonly availableProjects = signal<Project[]>([]);
  readonly projectsLoading = signal<boolean>(false);
  readonly selectedProjectId = signal<string | null>(null);
  readonly driveFolder = signal<ProjectDriveFolder | null>(null);
  readonly projectDisplayCode = signal<string>('');
  readonly projectName = signal<string>('');
  readonly supersedeDraftId = signal<string | null>(null);
  readonly alertError = signal<FinalizeErrorMessage | null>(null);
  readonly currentUserEmail: string | null = inject(UserService).getUser()?.email ?? null;
  readonly directoryProjectId = computed<string | null>(() => {
    const id = this.isStandalone() ? this.selectedProjectId() : this.launchId();
    return id || null;
  });

  @ViewChild(AlertConfigFormComponent) private readonly alertConfigForm?: AlertConfigFormComponent;
  #finalizedAlertConfig: AlertConfigFormValue | null = null;
  #finalizedDirectories: AlertDirectories | null = null;

  readonly #assetIds = toSignal(this.form.controls.assetIds.valueChanges, { initialValue: [] as string[] });
  readonly #driveFiles = toSignal(this.form.controls.driveFiles.valueChanges, { initialValue: [] as ApprovalDriveFileSelection[] });
  readonly #ziflowFolder = toSignal(this.form.controls.ziflowFolder.valueChanges, { initialValue: null as string | null });
  readonly #titleValue = toSignal(this.form.controls.title.valueChanges, { initialValue: '' });
  readonly #dueDateValue = toSignal(this.form.controls.dueDate.valueChanges, { initialValue: '' });
  readonly #categoryValue = toSignal(this.form.controls.category.valueChanges, { initialValue: '' });
  readonly #subtypeValue = toSignal(this.form.controls.subtype.valueChanges, { initialValue: '' });
  readonly #subtypePayloadRaw = toSignal(
    this.form.controls.subtypePayload.valueChanges.pipe(map(() => this.form.controls.subtypePayload.getRawValue())),
    {
      initialValue: this.form.controls.subtypePayload.getRawValue(),
    },
  );
  readonly #subtypePayloadValue = computed(() => subtypePayloadValueFromForm(this.#subtypeValue(), this.#subtypePayloadRaw()));
  readonly #marketingRequestLink = toSignal(this.form.controls.marketingRequestLink.valueChanges, { initialValue: '' });
  readonly #specificCampaignName = toSignal(this.form.controls.specificCampaignName.valueChanges, { initialValue: '' });
  readonly #specificCampaignStartDate = toSignal(this.form.controls.specificCampaignStartDate.valueChanges, { initialValue: '' });
  readonly #specificCampaignEndDate = toSignal(this.form.controls.specificCampaignEndDate.valueChanges, { initialValue: '' });
  readonly #driveValidationById = signal<Record<string, DriveFileValidation>>({});

  readonly hasComputerItems = computed(() => this.#assetIds().length > 0);
  readonly hasDriveItems = computed(() => this.#driveFiles().some(file => this.#driveSelectionCount(file) > 0));
  readonly hasZiflowFolder = computed(() => !!this.#ziflowFolder());
  readonly hasUploads = computed(() => this.hasComputerItems() || this.hasDriveItems() || this.hasZiflowFolder());
  readonly drivePreflightSummaries = computed<DrivePreflightSummary[]>(() => {
    const summaries = this.#driveValidationById();
    return this.#driveFiles().flatMap(file => {
      const summary = summaries[file.driveFileId];
      return summary
        ? [
            {
              driveFileId: file.driveFileId,
              rootUrl: file.url ?? null,
              selectedChildDriveFileIds: file.selectedChildDriveFileIds,
              ...summary,
            },
          ]
        : [];
    });
  });
  readonly availableSubtypes = computed(() => subtypesForCategory(this.#categoryValue()));
  readonly isMarketing = computed(() => this.#categoryValue() === 'marketing');
  readonly isMarketingAsset = computed(() => this.#subtypeValue() === 'marketing_asset');
  readonly showValidationMode = computed(() => supportsValidationMode(this.#subtypeValue()));
  readonly isUrlBasedSubtype = computed(() => isUrlBasedSubtype(this.#subtypeValue()));
  readonly isSheetBasedSubtype = computed(() => isSheetBasedSubtype(this.#subtypeValue()));

  readonly steps = computed<WizardStep[]>(() => {
    const out: WizardStep[] = [];
    if (this.isStandalone()) {
      out.push('project');
    }
    out.push('type');
    if (this.isMarketing()) {
      out.push('campaign');
    }
    // Events pick their subtype on the type step (Evento / Evento Fever cards),
    // so they skip the dedicated subtype screen and go straight to configure.
    if (!categorySelectsSubtypeAtType(this.#categoryValue())) {
      out.push('subtype');
    }
    out.push('configure', 'alerts', 'review');
    return out;
  });
  readonly isFirstStep = computed(() => this.steps().indexOf(this.currentStep()) <= 0);
  readonly isLastStep = computed(() => {
    const steps = this.steps();
    return steps.indexOf(this.currentStep()) === steps.length - 1;
  });
  readonly currentStepIndex = computed<number>(() => this.steps().indexOf(this.currentStep()));
  readonly stepViews = computed<WizardStepView[]>(() => {
    const steps = this.steps();
    const currentIdx = steps.indexOf(this.currentStep());
    return steps.map((step, idx) => ({
      id: step,
      label: `approvals.new.steps.${step}`,
      state: idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'upcoming',
    }));
  });

  readonly #campaignValid = computed(() =>
    isCampaignComplete(
      this.isMarketing(),
      this.#marketingRequestLink(),
      this.#specificCampaignName(),
      this.#specificCampaignStartDate(),
      this.#specificCampaignEndDate(),
    ),
  );
  readonly #configureValid = computed(
    () =>
      isConfigureComplete(this.#subtypeValue(), this.#titleValue(), this.#subtypePayloadValue(), this.hasUploads()) &&
      this.#dueDateValue().trim().length > 0,
  );
  readonly canSubmit = computed(() => !!this.#categoryValue() && !!this.#subtypeValue() && this.#campaignValid() && this.#configureValid());

  readonly uploadCount = computed(
    () => this.#assetIds().length + this.#driveFiles().reduce((count, file) => count + this.#driveSelectionCount(file), 0),
  );
  readonly summaryLinks = computed(() => {
    const value = this.#subtypePayloadValue();
    const urls = value?.urls ?? [];
    const modes = value?.urlPartnerReviewModes ?? [];
    const descriptions = value?.urlDescriptions ?? [];
    return urls.map((url, i) => ({ url, mode: modes[i] ?? 'approve', description: descriptions[i] ?? '' }));
  });

  reviewRecipients(): { partners: string[]; fever: string[] } {
    const config = this.#finalizedAlertConfig;
    const directories = this.#finalizedDirectories;
    if (!config || !config.alertsEnabled || !directories) {
      return { partners: [], fever: [] };
    }
    return resolveAlertRecipientDisplays(config, directories);
  }

  reviewReminders(): { enabled: boolean; frequency: string; time: string } {
    const cfg = this.form.controls.alertConfig.value;
    if (!cfg || !cfg.alertsEnabled) {
      return { enabled: false, frequency: '', time: '' };
    }
    const hour = cfg.reminderLocalHour;
    const tz = cfg.reminderTimezone;
    const time = hour != null ? `${String(hour).padStart(2, '0')}:00${tz ? ` · ${tz}` : ''}` : (tz ?? '');
    return { enabled: true, frequency: cfg.frequency ?? '', time };
  }

  readonly typeOptions: ReadonlyArray<ApprovalTypeOption> = APPROVAL_TYPE_OPTIONS;
  readonly marketingLinkOptions: ReadonlyArray<string> = ['general', 'specific', 'none'];

  readonly #destroyRef = inject(DestroyRef);
  readonly #partnerService = inject(PartnerService);
  readonly #service = inject(ApprovalsService);
  readonly #driveFolderService = inject(ProjectDriveFolderService);
  readonly #projectsService = inject(ProjectsService);
  readonly #assetsService = inject(ApprovalAssetsService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly ziflowEnabled = this.#optimizelyService.isFeatureEnabled(FeatureFlags.ZIFLOW_APPROVAL_FOLDERS) ?? false;
  protected readonly hasAssetTabs = computed(() => this.isMarketingAsset() && this.ziflowEnabled);
  readonly #dialogService = inject(IgntDialogService);
  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #alertConfigPrefetch = inject(AlertConfigPrefetchService);
  #suggestedValidationMode: ApprovalValidationMode | null = null;
  #draftIdToLoad: string | null = null;
  #exitDecision: Subject<boolean> | null = null;
  #exitConfirmed = false;

  constructor() {
    this.form.addValidators(() => this.#approvalReadinessErrors());

    const routeProjectId = this.#activatedRoute.parent?.snapshot.paramMap.get('projectId') ?? '';
    this.launchId.set(routeProjectId);
    this.isStandalone.set(routeProjectId === '');
    this.currentStep.set(this.steps()[0]);
    const draftIdParam = this.#activatedRoute.snapshot.queryParamMap.get('draftId');
    if (draftIdParam) {
      this.supersedeDraftId.set(draftIdParam);
    }
    this.#draftIdToLoad = draftIdParam;

    this.form.controls.category.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => {
      if (!subtypesForCategory(value).includes(this.form.controls.subtype.value)) {
        this.form.controls.subtype.setValue('');
      }
      if (value !== 'marketing') {
        this.form.controls.marketingRequestLink.setValue('');
        this.form.controls.specificCampaignName.setValue('');
        this.form.controls.specificCampaignStartDate.setValue('');
        this.form.controls.specificCampaignEndDate.setValue('');
      }
    });
    this.form.controls.subtype.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      resetSubtypePayloadForm(this.form.controls.subtypePayload);
      this.form.updateValueAndValidity();
    });
    this.form.controls.subtype.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.#destroyRef)).subscribe(subtype => {
      this.#resetAssetStep();
      this.#dropValidationModeUnsupportedBy(subtype);
    });
    toObservable(this.directoryProjectId)
      .pipe(distinctUntilChanged(), skip(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#resetAssetStep());

    this.#partnerService
      .observePartner()
      .pipe(
        filter((partner): partner is Partner => partner !== null),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(partner => {
        this.partnerId.set(partner.id);
        if (this.#draftIdToLoad) {
          this.#loadDraft(partner.id, this.#draftIdToLoad);
        }
        if (this.isStandalone()) {
          this.#loadProjects(partner.id);
          // Standalone: the project is chosen on the first step, so the prefetch waits for onProjectPicked().
        } else {
          this.#loadDriveFolder(partner.id, this.launchId());
          this.#loadProjectDisplayCode(partner.id, this.launchId());
          // Launch-scoped: the project is fixed by the route, so warm the alert-config reads now (step 1).
          this.#prefetchAlertDirectory();
        }
      });
  }

  // Warms the alert-config directory/Slack reads so the (later) alerts step renders instantly. Called with the
  // committed directory project (which may be null for a standalone "no launch"), matching the id the
  // AlertConfigFormComponent later reads — so the on-mount request is served from cache instead of firing anew.
  #prefetchAlertDirectory(): void {
    const partnerId = this.partnerId();
    if (partnerId === null) {
      return;
    }
    const organizationId = this.#partnerService.getPartner()?.id ?? partnerId;
    this.#alertConfigPrefetch.prefetch(partnerId, this.directoryProjectId(), organizationId);
  }

  selectType(option: ApprovalTypeOption): void {
    // Set the category first so its valueChanges subscription clears any stale
    // subtype, then apply this card's subtype (null for categories that keep a
    // dedicated subtype step, e.g. marketing).
    this.form.controls.category.setValue(option.category);
    this.form.controls.subtype.setValue(option.subtype ?? '');
    // B21: selecting a card advances straight to the next step.
    this.next();
  }

  isTypeSelected(option: ApprovalTypeOption): boolean {
    if (option.subtype) {
      return this.#categoryValue() === option.category && this.#subtypeValue() === option.subtype;
    }
    return this.#categoryValue() === option.category;
  }

  typeOptionLabelKey(option: ApprovalTypeOption): string {
    return option.subtype
      ? `approvals.new.metadata.subtype.options.${option.subtype}`
      : `approvals.new.type.options.${option.category}.label`;
  }

  typeOptionDescKey(option: ApprovalTypeOption): string {
    return option.subtype ? `approvals.new.subtype.help.${option.subtype}` : `approvals.new.type.options.${option.category}.description`;
  }

  selectSubtype(subtype: string): void {
    this.form.controls.subtype.setValue(subtype);
    // B21: picking a subtype card advances straight to configure.
    this.next();
  }

  onZiflowFolderChange(selection: ZiflowFolderSelection): void {
    this.form.controls.ziflowFolder.setValue(selection.folder);
    this.form.controls.ziflowFolderThumbnail.setValue(selection.thumbnailUrl);
    this.#suggestValidationMode();
  }

  #clearZiflowSelection(): void {
    if (this.form.controls.ziflowFolder.value === null && this.form.controls.ziflowFolderThumbnail.value === null) {
      return;
    }
    this.form.controls.ziflowFolder.setValue(null);
    this.form.controls.ziflowFolderThumbnail.setValue(null);
    this.#suggestValidationMode();
  }

  #resetAssetStep(): void {
    this.activeAssetTab.set(0);
    this.#clearZiflowSelection();
  }
  #dropValidationModeUnsupportedBy(subtype: string | null): void {
    const alertConfig = this.form.controls.alertConfig.value;
    if (alertConfig === null || !subtype || supportsValidationMode(subtype) || alertConfig.validationMode === 'only_one') {
      return;
    }
    this.#suggestedValidationMode = 'only_one';
    this.form.controls.alertConfig.setValue({ ...alertConfig, validationMode: 'only_one' });
  }

  #suggestValidationMode(): void {
    const alertConfig = this.form.controls.alertConfig.value;
    if (alertConfig === null) {
      return;
    }
    const suggested: ApprovalValidationMode = this.form.controls.ziflowFolder.value ? 'everyone' : 'only_one';
    if (alertConfig.validationMode === suggested) {
      return;
    }
    const chosenByUser = alertConfig.validationMode !== (this.#suggestedValidationMode ?? DEFAULT_ALERT_CONFIG.validationMode);
    if (chosenByUser) {
      return;
    }
    this.#suggestedValidationMode = suggested;
    this.form.controls.alertConfig.setValue({ ...alertConfig, validationMode: suggested });
  }

  selectMarketingLink(link: string): void {
    this.form.controls.marketingRequestLink.setValue(link);
    // B21: advance on card click. The "specific" card needs a campaign name
    // typed in-place, so it stays on the step until the user continues.
    if (link !== 'specific') {
      this.next();
    }
  }

  next(): void {
    const steps = this.steps();
    const index = steps.indexOf(this.currentStep());
    if (index < 0 || index >= steps.length - 1) {
      return;
    }
    const step = this.currentStep();
    if (!this.isStepValid(step)) {
      return;
    }
    if (step === 'alerts' && !this.#gateAlerts()) {
      return;
    }
    this.currentStep.set(steps[index + 1]);
  }

  previous(): void {
    this.alertError.set(null);
    const steps = this.steps();
    const index = steps.indexOf(this.currentStep());
    if (index > 0) {
      this.currentStep.set(steps[index - 1]);
    }
  }

  onStepSelect(index: number): void {
    const steps = this.steps();
    const currentIndex = steps.indexOf(this.currentStep());
    if (index < 0 || index >= steps.length || index === currentIndex) {
      return;
    }
    this.alertError.set(null);
    if (index < currentIndex) {
      this.currentStep.set(steps[index]);
      return;
    }
    for (let i = currentIndex; i < index; i++) {
      if (!this.isStepValid(steps[i]) || (steps[i] === 'alerts' && !this.#gateAlerts())) {
        this.currentStep.set(steps[i]);
        return;
      }
    }
    this.currentStep.set(steps[index]);
  }

  isStepValid(step: WizardStep): boolean {
    switch (step) {
      case 'project':
        return this.selectedProjectId() !== null;
      case 'type':
        return !!this.#categoryValue();
      case 'campaign':
        return this.#campaignValid();
      case 'subtype':
        return !!this.#subtypeValue();
      case 'configure':
        return this.#configureValid();
      case 'alerts':
        return this.#validationRuleHasSomebodyToWaitFor();
      default:
        return true;
    }
  }

  #validationRuleHasSomebodyToWaitFor(): boolean {
    return !validationModeNeedsRecipient(this.form.controls.alertConfig.value);
  }

  #approvalReadinessErrors(): ValidationErrors | null {
    const raw = this.form.getRawValue();
    const payload = subtypePayloadValueFromForm(raw.subtype, raw.subtypePayload);
    const complete =
      !!raw.category &&
      !!raw.subtype &&
      isCampaignComplete(
        raw.category === 'marketing',
        raw.marketingRequestLink,
        raw.specificCampaignName,
        raw.specificCampaignStartDate,
        raw.specificCampaignEndDate,
      ) &&
      isConfigureComplete(raw.subtype, raw.title, payload, raw.assetIds.length > 0 || raw.driveFiles.length > 0 || !!raw.ziflowFolder) &&
      raw.dueDate.trim().length > 0;

    return complete ? null : { approvalIncomplete: true };
  }

  openDatePicker(event: Event): void {
    (event.target as HTMLInputElement).showPicker?.();
  }

  dueDateHint(): string {
    return this.currentStep() === 'configure' && this.form.controls.dueDate.invalid ? 'approvals.new.actions.dueDateMissingHint' : '';
  }

  onProjectPicked(projectId: string): void {
    // Assets are created against the selected launch (or the partner for "no launch"), so a genuine change of
    // selection invalidates everything already collected. `null` means nothing was picked yet, so nothing can
    // have been uploaded; re-picking the same value (including re-confirming "no launch") keeps the user's work.
    const previousProjectId = this.selectedProjectId();
    this.selectedProjectId.set(projectId);
    if (previousProjectId !== null && previousProjectId !== projectId) {
      this.#clearCollectedAssets();
    }
    const partnerId = this.partnerId();
    if (partnerId === null) {
      return;
    }
    if (projectId) {
      this.#loadDriveFolder(partnerId, projectId);
      const picked = this.availableProjects().find(project => project.id === projectId);
      this.projectDisplayCode.set(picked?.displayCode ?? '');
      this.projectName.set(picked?.name ?? '');
    } else {
      this.driveFolder.set(null);
      this.projectDisplayCode.set('');
      this.projectName.set('');
    }
    // Standalone flow: the project is chosen on the first step, so this is where the directory prefetch starts.
    this.#prefetchAlertDirectory();
    this.next();
  }

  /** Parses pasted Drive URLs for the shared upload component. Bound in the template. */
  readonly parseDriveUrl = parseDriveUrl;

  readonly mediaMimeTypes = APPROVAL_UPLOAD_MIME_TYPES;
  readonly mediaAccept = APPROVAL_UPLOAD_ACCEPT;
  readonly mediaFormatsLabel = APPROVAL_UPLOAD_FORMATS_LABEL;
  readonly driveFolderMimeType = 'application/vnd.google-apps.folder';

  #createdApprovalTarget: unknown[] | null = null;

  /**
   * Uploads a local file via the approval assets service; adapts the response for
   * {@link FzUploadComponent}. A missing launch is expected ("not linked to any launch") and routes the
   * service to its partner-scoped endpoints; only a missing partner is a genuine blocker.
   */
  readonly assetCommit: FzFileCommit = file => {
    const partnerId = this.partnerId();
    if (partnerId === null) {
      return of<FzUploadResult>({ ok: false, errorMessage: 'approvals.upload.errors.partnerUnavailable' });
    }
    return this.#assetsService.upload(partnerId, this.#effectiveProjectId(), file).pipe(map(toAssetResult));
  };

  readonly previewAsset: FzPreviewResolver = item =>
    this.#assetsService.fetchAssetUrl(this.partnerId() ?? 0, this.#effectiveProjectId(), item.id ?? '');

  /**
   * Validates a pasted/picked Drive selection against the backend the moment it is added, so an
   * unreachable or out-of-folder file surfaces an actionable message here instead of failing the whole
   * approval at submit. The file is still imported at submit time; this only probes accessibility.
   */
  readonly validateDrive: FzDriveCommit = selection => {
    const partnerId = this.partnerId();
    if (partnerId === null) {
      return of<FzUploadResult>({ ok: false, errorMessage: 'approvals.upload.errors.partnerUnavailable' });
    }
    return this.#assetsService.validateDriveFile(partnerId, this.#effectiveProjectId(), selection.driveFileId).pipe(
      map((response): FzUploadResult => {
        if (response.error || !response.data) {
          this.#forgetDriveValidation(selection.driveFileId);
          return { ok: false, errorMessage: driveValidationErrorKey(response.error?.code) };
        }
        if (!hasDrivePreflightSummary(response.data)) {
          this.#forgetDriveValidation(selection.driveFileId);
          return { ok: true };
        }
        if ((response.data.acceptedCount ?? 0) < 1) {
          this.#forgetDriveValidation(selection.driveFileId);
          return { ok: false, errorMessage: 'approvals.new.upload.noImportableDriveFiles' };
        }
        this.#rememberDriveValidation(selection.driveFileId, response.data);
        return { ok: true };
      }),
    );
  };

  /**
   * Splits the shared component's items back into the two form controls the create payload reads:
   * computer uploads → `assetIds`, Drive selections → `driveFiles`.
   */
  onUploadItemsChange(items: FzUploadItem[]): void {
    const assetIds = items
      .filter(item => item.source === 'computer' && item.status === 'uploaded' && item.id)
      .map(item => item.id as string);
    const currentSelections = new Map(
      this.form.controls.driveFiles.value.map(file => [file.driveFileId, file.selectedChildDriveFileIds] as const),
    );
    const validations = this.#driveValidationById();
    const driveFiles = items
      .filter(item => item.source === 'drive' && item.status === 'uploaded')
      .map<ApprovalDriveFileSelection>(item => ({
        driveFileId: item.driveFileId as string,
        name: item.name,
        mimeType: item.mimeType ?? '',
        url: item.url,
        selectedChildDriveFileIds:
          currentSelections.get(item.driveFileId as string) ?? defaultSelectedDriveFileIds(validations[item.driveFileId as string]),
      }));
    this.form.controls.assetIds.setValue(assetIds);
    this.form.controls.assetRelativePaths.setValue(uploadedAssetRelativePaths(items));
    this.form.controls.driveFiles.setValue(driveFiles);
    this.#pruneDriveValidationSummaries(driveFiles);
  }

  onDriveFileSelectionChange(driveFileId: string, selectedDriveFileIds: string[]): void {
    const driveFiles = this.form.controls.driveFiles.value.map(file =>
      file.driveFileId === driveFileId ? { ...file, selectedChildDriveFileIds: selectedDriveFileIds } : file,
    );
    this.form.controls.driveFiles.setValue(driveFiles);
    this.form.controls.driveFiles.markAsDirty();
    this.form.controls.driveFiles.markAsTouched();
  }

  cancel(): void {
    // B22: Cancel returns to the partner overview (launches grid), not the approvals list.
    this.#router.navigate(['/project-management/projects']);
  }

  submit(): void {
    // On send, prompt for an optional description (may be left blank), then create.
    this.#dialogService
      .openModal<DescriptionPromptDialogResult, DescriptionPromptDialogData>(DescriptionPromptDialogComponent, {
        size: 'sm',
        data: { value: this.form.controls.description.value },
      })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(description => {
        if (description === undefined) {
          return;
        }
        this.form.controls.description.setValue(description);
        this.#dispatchCreate(false);
      });
  }

  saveDraft(): void {
    this.#dispatchCreate(true);
  }

  hasUnsavedWork(): boolean {
    if (this.#exitConfirmed || this.created()) {
      return false;
    }
    return this.form.dirty || (this.#assetIds()?.length ?? 0) > 0 || (this.#driveFiles()?.length ?? 0) > 0 || this.hasZiflowFolder();
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
          return this.#saveDraftAndExit$();
        }
        return of(false);
      }),
    );
  }

  #saveDraftAndExit$(): Observable<boolean> {
    const decision = new Subject<boolean>();
    this.#exitDecision = decision;
    this.saveDraft();
    if (!this.submitting()) {
      this.#exitDecision = null;
      return of(false);
    }
    return decision.pipe(take(1));
  }

  #dispatchCreate(saveAsDraft: boolean): void {
    const partnerId = this.partnerId();
    if (this.submitting() || partnerId === null) {
      return;
    }
    if (!saveAsDraft && !this.canSubmit()) {
      return;
    }

    const finalizedAlertConfig = this.#finalizeAlertConfig();
    if (finalizedAlertConfig.ok === false) {
      this.#refuseOnTheAlertsStep(finalizedAlertConfig.error);
      return;
    }
    this.alertError.set(null);

    this.submitting.set(true);
    this.error.set(null);
    this.skippedDriveFiles.set([]);

    const projectId = this.#effectiveProjectId();
    const payload = buildApprovalCreatePayload(this.form.getRawValue(), this.isMarketing(), {
      alertConfig: toAlertConfigPayload(finalizedAlertConfig.value),
      saveAsDraft,
      supersedeId: this.supersedeDraftId(),
    });

    const create$ =
      projectId !== null ? this.#service.create(partnerId, projectId, payload) : this.#service.createStandalone(partnerId, payload);

    create$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: response => {
        this.submitting.set(false);
        if (response.error || !response.data) {
          this.#handleSubmitFailure(saveAsDraft);
          return;
        }
        // A non-draft approval is created PENDING, so it joins the server-derived pending counters
        // straight away and the cached projects list would otherwise report one too few. That holds
        // for a standalone approval too: the partner-wide pending total counts it. A draft is created
        // DRAFT, which the counters do not count, so it does not need the list refetched.
        if (!saveAsDraft) {
          this.#projectsService.invalidate(partnerId);
        }
        let target: unknown[];
        if (projectId !== null) {
          target = saveAsDraft
            ? ['/project-management/projects', projectId, 'approvals']
            : ['/project-management/projects', projectId, 'approvals', response.data.id];
        } else {
          target = saveAsDraft ? ['/project-management/approvals'] : ['/project-management/approvals', response.data.id];
        }
        const skipped = saveAsDraft ? [] : response.data.skippedDriveFiles;
        this.#exitConfirmed = true;
        if (this.#exitDecision) {
          this.#exitDecision.next(true);
          this.#exitDecision = null;
          return;
        }
        if (skipped.length > 0) {
          this.created.set(true);
          this.skippedDriveFiles.set(skipped);
          this.#createdApprovalTarget = target;
          return;
        }
        this.#router.navigate(target);
      },
      error: () => {
        this.submitting.set(false);
        this.#handleSubmitFailure(saveAsDraft);
      },
    });
  }

  #handleSubmitFailure(saveAsDraft: boolean): void {
    this.error.set('submitFailed');
    if (this.#exitDecision) {
      this.#exitDecision.next(false);
      this.#exitDecision = null;
    }
    if (!saveAsDraft) {
      this.currentStep.set('configure');
    }
  }

  goToCreatedApproval(): void {
    if (this.#createdApprovalTarget) {
      this.#router.navigate(this.#createdApprovalTarget);
    }
  }

  #rememberDriveValidation(driveFileId: string, validation: DriveFileValidation): void {
    this.#driveValidationById.update(current => ({ ...current, [driveFileId]: validation }));
  }

  #forgetDriveValidation(driveFileId: string): void {
    this.#driveValidationById.update(current => {
      if (!(driveFileId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[driveFileId];
      return next;
    });
  }

  /**
   * Drops every asset gathered so far: the ids of the uploaded computer files, the Drive selections, and their
   * cached preflight summaries (which were validated against the previous launch's Drive folder). The shared
   * upload component keeps its own item list, but the configure step lives in a template `@switch` case, so that
   * component is destroyed on any step change and re-renders with an empty list — no orphaned rows survive.
   */
  #clearCollectedAssets(): void {
    this.form.controls.assetIds.setValue([]);
    this.form.controls.assetRelativePaths.setValue({});
    this.form.controls.driveFiles.setValue([]);
    this.#driveValidationById.set({});
  }

  #pruneDriveValidationSummaries(driveFiles: ApprovalDriveFileSelection[]): void {
    const allowed = new Set(driveFiles.map(file => file.driveFileId));
    this.#driveValidationById.update(current =>
      Object.fromEntries(Object.entries(current).filter(([driveFileId]) => allowed.has(driveFileId))),
    );
  }

  #driveSelectionCount(file: ApprovalDriveFileSelection): number {
    if (!isApprovalDriveFileSelectionActive(file)) {
      return 0;
    }
    if (file.selectedChildDriveFileIds !== undefined) {
      return file.selectedChildDriveFileIds.length;
    }
    const validation = this.#driveValidationById()[file.driveFileId];
    return driveValidationAcceptedFileCount(validation);
  }

  /** `null` for a standalone approval not linked to any launch, which routes the asset calls to the partner scope. */
  #effectiveProjectId(): string | null {
    return (this.isStandalone() ? this.selectedProjectId() : this.launchId()) || null;
  }

  #loadProjectDisplayCode(partnerId: number, projectId: string): void {
    this.#projectsService
      .get(partnerId, projectId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          if (response.data) {
            this.projectDisplayCode.set(response.data.displayCode ?? '');
            this.projectName.set(response.data.name ?? '');
          }
        },
      });
  }

  #refuseOnTheAlertsStep(error: FinalizeErrorMessage | null): void {
    this.alertError.set(error);
    if (this.steps().includes('alerts')) {
      this.currentStep.set('alerts');
    }
  }

  #gateAlerts(): boolean {
    const result = this.#finalizeAlertConfig();
    if (result.ok === false) {
      this.alertError.set(result.error);
      return false;
    }
    this.alertError.set(null);
    this.#finalizedAlertConfig = result.value;
    this.#finalizedDirectories = this.alertConfigForm?.loadedDirectories ?? null;
    return true;
  }

  #finalizeAlertConfig(): { ok: true; value: AlertConfigFormValue | null } | { ok: false; error: FinalizeErrorMessage | null } {
    const form = this.alertConfigForm;
    if (!form) {
      const value = this.form.controls.alertConfig.value;
      if (validationModeNeedsRecipient(value)) {
        return { ok: false, error: describeFinalizeError('validation_mode_needs_recipient') };
      }
      return { ok: true, value };
    }
    const result = form.finalize();
    if (result.ok === false) {
      return { ok: false, error: describeFinalizeError(result.error) };
    }
    return { ok: true, value: result.value };
  }

  #loadDriveFolder(partnerId: number, projectId: string): void {
    this.#driveFolderService
      .get(partnerId, projectId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => this.driveFolder.set(response.error || !response.data ? null : response.data),
        error: () => this.driveFolder.set(null),
      });
  }

  #loadProjects(partnerId: number): void {
    this.projectsLoading.set(true);
    this.#projectsService
      .list(partnerId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          this.projectsLoading.set(false);
          if (response.data) {
            this.availableProjects.set(response.data);
          }
        },
        error: () => {
          this.projectsLoading.set(false);
        },
      });
  }

  #loadDraft(partnerId: number, draftId: string): void {
    this.#service
      .get(partnerId, this.launchId(), draftId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        if (response.error || !response.data) {
          return;
        }
        const { patch, subtypePayload } = parseDraftPayload(response.data);
        this.form.patchValue(patch);
        patchSubtypePayloadForm(this.form.controls.subtypePayload, subtypePayload);
        this.form.updateValueAndValidity();
      });
  }
}

function toAssetResult(response: BaseResponse<ApprovalAsset | null>): FzUploadResult {
  if (response.error || !response.data) {
    return { ok: false, errorMessage: response.error?.message };
  }
  return { ok: true, id: response.data.id };
}

/** Maps the backend Drive-validation error code to an actionable i18n key the upload component shows. */
const DRIVE_VALIDATION_ERROR_KEYS: Readonly<Record<string, string>> = {
  DRIVE_FILE_NO_ACCESS: 'fzUpload.errors.driveLinkNoAccess',
  DRIVE_FILE_NOT_FOUND: 'fzUpload.errors.driveLinkNoAccess',
  DRIVE_FILE_TOO_LARGE: 'fzUpload.errors.driveLinkTooLarge',
  DRIVE_FOLDER_NOT_CONFIGURED: 'fzUpload.errors.driveFolderNotConfigured',
};

function driveValidationErrorKey(code: string | number | undefined): string {
  return (code !== undefined && DRIVE_VALIDATION_ERROR_KEYS[String(code)]) || 'fzUpload.errors.driveLinkNoAccess';
}

function hasDrivePreflightSummary(validation: DriveFileValidation): boolean {
  return validation.discoveredCount !== null && validation.acceptedCount !== null && validation.skippedCount !== null;
}

function defaultSelectedDriveFileIds(validation?: DriveFileValidation): string[] | undefined {
  if (!validation || validation.acceptedFiles.length === 0) {
    return undefined;
  }
  return validation.acceptedFiles.map(file => file.driveFileId);
}

function driveValidationAcceptedFileCount(validation?: DriveFileValidation): number {
  if (!validation) {
    return 1;
  }
  if (validation.acceptedFiles.length > 0) {
    return validation.acceptedFiles.length;
  }
  return validation.acceptedCount ?? 1;
}
