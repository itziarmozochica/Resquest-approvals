import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AlertConfigFormComponent } from '@fz-original/app/modules/ir-approval/shared/components/alert-config-form/alert-config-form.component';
import { DescriptionPromptDialogComponent } from '@fz-original/app/modules/ir-approval/shared/components/description-prompt-dialog/description-prompt-dialog.component';
import { FzWizardStepperComponent } from '@fz-original/app/modules/ir-approval/shared/components/fz-wizard-stepper/fz-wizard-stepper.component';
import { AlertDirectories, FinalizeErrorMessage } from '@fz-original/app/modules/ir-approval/shared/models/alert-config-finalize.model';
import { AlertConfigFormValue, createDefaultAlertConfig } from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';
import {
  DescriptionPromptDialogData,
  DescriptionPromptDialogResult,
} from '@fz-original/app/modules/ir-approval/shared/models/description-prompt-dialog.model';
import { WizardStepView } from '@fz-original/app/modules/ir-approval/shared/models/fz-wizard-stepper.model';
import { AlertConfigPrefetchService } from '@fz-original/app/modules/ir-approval/shared/services/alert-config-prefetch.service';
import {
  describeFinalizeError,
  resolveAlertRecipientDisplays,
} from '@fz-original/app/modules/ir-approval/shared/utils/alert-config-finalize.util';
import { toAlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/utils/alert-config-payload.util';
import { Project } from '@fz-original/app/modules/project-management/models/project.model';
import { PROJECT_MANAGEMENT_QUICK_SETUP_FROM_IR_FLAG } from '@fz-original/app/modules/project-management/project-management.optimizely-features';
import { ProjectsService } from '@fz-original/app/modules/project-management/services/projects.service';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntButtonComponent, IgntDialogService } from '@ignite/common';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { filter, take } from 'rxjs/operators';

import { LaunchPickerComponent } from '../../components/launch-picker/launch-picker.component';
import { QuestionCustomizeCardComponent } from '../../components/question-customize-card/question-customize-card.component';
import { InformationRequestQuestion } from '../../models/information-request-question.model';
import { InformationRequestTemplateSummary } from '../../models/information-request-template.model';
import { MAIN_EVENT_REQUEST_TEMPLATE_KEY } from '../../models/main-event-stepper-template';
import { groupBySection, QuestionSectionGroup } from '../../models/question-section-grouping.util';
import {
  CreateInformationRequestPayload,
  InformationRequestsService,
  QuestionOverridePayload,
} from '../../services/information-requests.service';

export interface TemplateGroup {
  key: string;
  templates: InformationRequestTemplateSummary[];
}

const TEMPLATE_GROUP_ORDER: readonly string[] = ['listing', 'marketing', 'information'];
const OTHER_TEMPLATE_GROUP_KEY = 'other';
const EVENT_WAITLIST_TEMPLATE_KEY = 'event_waitlist';
const HIDDEN_TEMPLATE_KEYS = new Set<string>(['event_seating_map', 'legal', 'partner_info']);

export function groupTemplates(templates: InformationRequestTemplateSummary[]): TemplateGroup[] {
  const byGroup = new Map<string, InformationRequestTemplateSummary[]>();
  for (const template of templates) {
    const key = template.group ?? OTHER_TEMPLATE_GROUP_KEY;
    if (!byGroup.has(key)) {
      byGroup.set(key, []);
    }
    byGroup.get(key)!.push(template);
  }
  const orderedKeys = [
    ...TEMPLATE_GROUP_ORDER.filter(key => byGroup.has(key)),
    ...[...byGroup.keys()].filter(key => !TEMPLATE_GROUP_ORDER.includes(key) && key !== OTHER_TEMPLATE_GROUP_KEY),
    ...(byGroup.has(OTHER_TEMPLATE_GROUP_KEY) ? [OTHER_TEMPLATE_GROUP_KEY] : []),
  ];
  return orderedKeys.map(key => ({ key, templates: byGroup.get(key)! }));
}

type WizardStep = 'template' | 'details' | 'alerts' | 'review';
type WizardErrorKey = 'submitFailed' | 'templatesLoadFailed';

interface WizardForm {
  templateKey: FormControl<string>;
  title: FormControl<string>;
  description: FormControl<string>;
  dueDate: FormControl<string>;
  alertConfig: FormControl<AlertConfigFormValue | null>;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dueDateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  if (!value) {
    return null;
  }
  if (!ISO_DATE_PATTERN.test(value)) {
    return { dueDateFormat: true };
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || toLocalIsoDate(parsed) !== value) {
    return { dueDateFormat: true };
  }

  const today = new Date();
  const todayIso = toLocalIsoDate(today);
  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  const maxIso = toLocalIsoDate(maxDate);

  if (value < todayIso) {
    return { dueDatePast: true };
  }
  if (value > maxIso) {
    return { dueDateTooFar: true };
  }
  return null;
}

@Component({
  selector: 'app-information-request-new',
  templateUrl: './information-request-new.component.html',
  styleUrls: ['./information-request-new.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    IgntButtonComponent,
    IgntWrapperCardComponent,
    AlertConfigFormComponent,
    QuestionCustomizeCardComponent,
    FzWizardStepperComponent,
    LaunchPickerComponent,
  ],
  providers: [AlertConfigPrefetchService],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformationRequestNewComponent {
  readonly currentStep = signal<WizardStep>('template');
  readonly submitting = signal<boolean>(false);
  readonly templatesLoading = signal<boolean>(true);
  readonly templates = signal<InformationRequestTemplateSummary[]>([]);
  readonly error = signal<WizardErrorKey | null>(null);
  readonly steps: WizardStep[] = ['template', 'details', 'alerts', 'review'];
  readonly partnerId = signal<number | null>(null);
  readonly launchId = signal<string>('');
  readonly isStandalone = signal<boolean>(false);
  readonly availableProjects = signal<Project[]>([]);
  readonly projectsLoading = signal<boolean>(false);
  readonly selectedProjectId = signal<string | null>(null);
  readonly projectDisplayCode = signal<string>('');
  readonly projectName = signal<string>('');
  readonly templateOverrides = signal<Record<string, QuestionOverridePayload>>({});
  readonly alertError = signal<FinalizeErrorMessage | null>(null);
  readonly currentUserEmail: string | null = inject(UserService).getUser()?.email ?? null;
  /**
   * OPX-2912: with the flag on, the waitlist template is hidden (one main-plan template on the picker) and the
   * "Event · Main event" template drops the question-customization card, so no template_overrides reach the payload.
   * Every other template renders and behaves exactly as with the flag off.
   */
  readonly #quickSetupFromIr: boolean = inject(OptimizelyService).isFeatureEnabled(PROJECT_MANAGEMENT_QUICK_SETUP_FROM_IR_FLAG) === true;
  readonly directoryProjectId = computed<string | null>(() => {
    const id = this.isStandalone() ? this.selectedProjectId() : this.launchId();
    return id || null;
  });
  // Launch-scoped routes always carry one; standalone has three states — null (unanswered), '' ("no launch")
  // and a real id. Only the last counts as selected, and both falsy states are excluded by design.
  readonly #hasLaunchSelected = computed<boolean>(() => !this.isStandalone() || Boolean(this.selectedProjectId()));
  readonly currentStepIndex = computed<number>(() => this.steps.indexOf(this.currentStep()));
  readonly stepViews = computed<WizardStepView[]>(() => {
    const currentIdx = this.steps.indexOf(this.currentStep());
    return this.steps.map((step, idx) => ({
      id: step,
      label: `informationRequests.new.steps.${step}`,
      state: idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'upcoming',
    }));
  });

  readonly form: FormGroup<WizardForm>;

  readonly minDueDate: string;
  readonly maxDueDate: string;

  readonly #destroyRef = inject(DestroyRef);
  readonly #partnerService = inject(PartnerService);
  readonly #service = inject(InformationRequestsService);
  readonly #projectsService = inject(ProjectsService);
  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #dialogService = inject(IgntDialogService);
  readonly #alertConfigPrefetch = inject(AlertConfigPrefetchService);

  @ViewChild(AlertConfigFormComponent) private readonly alertConfigForm?: AlertConfigFormComponent;
  #finalizedAlertConfig: AlertConfigFormValue | null = null;
  #finalizedDirectories: AlertDirectories | null = null;

  constructor() {
    const today = new Date();
    this.minDueDate = toLocalIsoDate(today);
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    this.maxDueDate = toLocalIsoDate(maxDate);

    const fb = inject(FormBuilder).nonNullable;
    this.form = fb.group<WizardForm>({
      templateKey: fb.control('', { validators: [Validators.required] }),
      title: fb.control('', { validators: [Validators.required, Validators.minLength(3)] }),
      description: fb.control(''),
      dueDate: fb.control('', { validators: [Validators.required, dueDateRangeValidator] }),
      alertConfig: new FormControl<AlertConfigFormValue | null>(createDefaultAlertConfig()),
    });

    const routeProjectId = this.#activatedRoute.parent?.snapshot.paramMap.get('projectId') ?? '';
    this.launchId.set(routeProjectId);
    this.isStandalone.set(routeProjectId === '');

    this.#partnerService
      .observePartner()
      .pipe(
        filter((partner): partner is Partner => partner !== null),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(partner => {
        this.partnerId.set(partner.id);
        if (this.isStandalone()) {
          this.#loadProjects(partner.id);
          // Standalone: the project is chosen on the first step, so the prefetch waits for onProjectPicked().
        } else {
          this.#loadProjectDisplayCode(partner.id, this.launchId());
          this.#loadTemplates(partner.id);
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

  onProjectPicked(projectId: string): void {
    this.selectedProjectId.set(projectId);
    // OPX-3072: switching launches can hide the already-selected template (main event after moving to
    // "no launch"), so drop the stale selection instead of letting it survive invisibly to submit.
    const selectedKey = this.form.controls.templateKey.value;
    if (selectedKey && this.#isHiddenTemplate(selectedKey)) {
      this.form.controls.templateKey.setValue('');
      this.templateOverrides.set({});
    }
    const picked = this.availableProjects().find(project => project.id === projectId);
    this.projectDisplayCode.set(picked?.displayCode ?? '');
    this.projectName.set(picked?.name ?? '');
    const partnerId = this.partnerId();
    if (partnerId === null) {
      return;
    }
    if (projectId) {
      this.#loadTemplates(partnerId);
    } else {
      this.#loadFlatTemplates(partnerId);
    }
    // Standalone flow: the project is chosen on the first step, so this is where the directory prefetch starts.
    this.#prefetchAlertDirectory();
  }

  selectTemplate(key: string): void {
    this.form.controls.templateKey.setValue(key);
    this.templateOverrides.set({});
    // B21: selecting a template card advances to the next step immediately.
    this.next();
  }

  groupedTemplates(): TemplateGroup[] {
    return groupTemplates(this.templates().filter(template => !this.#isHiddenTemplate(template.key)));
  }

  templateGroupLabelKey(groupKey: string): string {
    return `informationRequests.new.template.groups.${groupKey}`;
  }

  // A quick-setup "Event · Main event" IR must reach the hub without template_overrides, so that template
  // drops the customization card; every other template keeps it.
  showQuestionCustomization(): boolean {
    return !(this.#quickSetupFromIr && this.form.controls.templateKey.value === MAIN_EVENT_REQUEST_TEMPLATE_KEY);
  }

  selectedTemplate(): InformationRequestTemplateSummary | null {
    const key = this.form.controls.templateKey.value;
    return this.templates().find(t => t.key === key) ?? null;
  }

  templateQuestions(): InformationRequestQuestion[] {
    return this.selectedTemplate()?.questions ?? [];
  }

  visibleTemplateQuestions(): InformationRequestQuestion[] {
    const overrides = this.templateOverrides();
    return this.templateQuestions().filter(question => overrides[question.id]?.hidden !== true);
  }

  groupedQuestions(): QuestionSectionGroup[] {
    return groupBySection(this.templateQuestions());
  }

  questionOverride(questionId: string): QuestionOverridePayload {
    return this.templateOverrides()[questionId] ?? {};
  }

  updateOverride(questionId: string, patch: QuestionOverridePayload): void {
    const current = this.templateOverrides();
    this.templateOverrides.set({ ...current, [questionId]: { ...current[questionId], ...patch } });
  }

  setQuestionHelpText(questionId: string, helpText: string | null): void {
    this.updateOverride(questionId, { help_text: helpText && helpText.length > 0 ? helpText : null });
  }

  toggleQuestionRequired(questionId: string, required: boolean): void {
    this.updateOverride(questionId, { required });
  }

  toggleQuestionHidden(questionId: string, hidden: boolean): void {
    this.updateOverride(questionId, { hidden });
  }

  isStepValid(step: WizardStep): boolean {
    if (step === 'template') {
      const launchChosen = !this.isStandalone() || this.selectedProjectId() !== null;
      return launchChosen && this.form.controls.templateKey.valid;
    }
    if (step === 'details') {
      return this.form.controls.title.valid && this.form.controls.dueDate.valid;
    }
    return true;
  }

  openDatePicker(event: Event): void {
    (event.target as HTMLInputElement).showPicker?.();
  }

  dueDateHint(): string {
    return this.currentStep() === 'details' && this.form.controls.dueDate.invalid
      ? 'informationRequests.new.actions.dueDateMissingHint'
      : '';
  }

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

  next(): void {
    const index = this.steps.indexOf(this.currentStep());
    if (index >= this.steps.length - 1) {
      return;
    }
    const step = this.currentStep();
    if (!this.isStepValid(step)) {
      return;
    }
    if (step === 'alerts' && !this.#gateAlerts()) {
      return;
    }
    this.currentStep.set(this.steps[index + 1]);
  }

  previous(): void {
    this.alertError.set(null);
    const index = this.steps.indexOf(this.currentStep());
    if (index > 0) {
      this.currentStep.set(this.steps[index - 1]);
    }
  }

  onStepSelect(index: number): void {
    const steps = this.steps;
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

  cancel(): void {
    const projectId = this.#effectiveProjectId();
    if (projectId) {
      this.#router.navigate(['/project-management/projects', projectId, 'information-requests']);
    } else {
      this.#router.navigate(['/project-management/information-requests']);
    }
  }

  submit(): void {
    const partnerId = this.partnerId();
    if (!this.form.valid || this.submitting() || partnerId === null || this.selectedTemplate() === null) {
      return;
    }
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
        this.#dispatchCreate();
      });
  }

  #dispatchCreate(): void {
    const partnerId = this.partnerId();
    const template = this.selectedTemplate();
    if (!this.form.valid || this.submitting() || partnerId === null || template === null) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    const projectId = this.#effectiveProjectId();
    const { title, description, dueDate, alertConfig } = this.form.getRawValue();
    const alertConfigPayload = toAlertConfigPayload(this.#finalizedAlertConfig ?? alertConfig);
    const overrides = this.templateOverrides();
    const hasOverrides = Object.keys(overrides).length > 0;
    const payload: CreateInformationRequestPayload = {
      service_id: template.key,
      service_name: template.label,
      title,
      template_key: template.key,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(dueDate ? { due_date: dueDate } : {}),
      ...(alertConfigPayload ? { alert_config: alertConfigPayload } : {}),
      ...(hasOverrides ? { template_overrides: overrides } : {}),
    };

    const create$ = projectId ? this.#service.create(partnerId, projectId, payload) : this.#service.createStandalone(partnerId, payload);

    create$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: response => {
        this.submitting.set(false);
        if (response.error || !response.data) {
          this.error.set('submitFailed');
          return;
        }
        // A new request is created PENDING, so it joins the server-derived pending counters straight
        // away and the cached projects list would otherwise report one too few.
        this.#projectsService.invalidate(partnerId);
        if (projectId) {
          this.#router.navigate(['/project-management/projects', projectId, 'information-requests', response.data.id]);
        } else {
          this.#router.navigate(['/project-management/information-requests', response.data.id]);
        }
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('submitFailed');
      },
    });
  }

  #effectiveProjectId(): string {
    return (this.isStandalone() ? this.selectedProjectId() : this.launchId()) ?? '';
  }

  #gateAlerts(): boolean {
    this.alertError.set(null);
    const form = this.alertConfigForm;
    if (!form) {
      this.#finalizedAlertConfig = this.form.controls.alertConfig.value;
      return true;
    }
    const result = form.finalize();
    if (result.ok === false) {
      this.alertError.set(describeFinalizeError(result.error));
      return false;
    }
    this.#finalizedAlertConfig = result.value;
    this.#finalizedDirectories = form.loadedDirectories;
    return true;
  }

  #loadTemplates(partnerId: number): void {
    this.templatesLoading.set(true);
    this.#service
      .listTemplates(partnerId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          this.templatesLoading.set(false);
          if (response.error || !response.data) {
            this.error.set('templatesLoadFailed');
            return;
          }
          this.templates.set(response.data);
        },
        error: () => {
          this.templatesLoading.set(false);
          this.error.set('templatesLoadFailed');
        },
      });
  }

  #loadFlatTemplates(partnerId: number): void {
    this.templatesLoading.set(true);
    this.#service
      .listTemplatesForPartner(partnerId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          this.templatesLoading.set(false);
          if (response.error || !response.data) {
            this.error.set('templatesLoadFailed');
            return;
          }
          this.templates.set(response.data);
        },
        error: () => {
          this.templatesLoading.set(false);
          this.error.set('templatesLoadFailed');
        },
      });
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

  #isHiddenTemplate(key: string): boolean {
    if (HIDDEN_TEMPLATE_KEYS.has(key)) {
      return true;
    }
    // OPX-3084: the main-event template exists only to drive a launch quick setup, so it is off the picker
    // entirely while the flag is off. OPX-3072: with the flag on it is on offer once a launch is actually
    // selected — neither the unanswered launch question nor an explicit "no launch" qualifies.
    if (!this.#quickSetupFromIr) {
      return key === MAIN_EVENT_REQUEST_TEMPLATE_KEY;
    }
    return key === EVENT_WAITLIST_TEMPLATE_KEY || (key === MAIN_EVENT_REQUEST_TEMPLATE_KEY && !this.#hasLaunchSelected());
  }
}
