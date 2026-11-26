import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  forwardRef,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormGroup, ReactiveFormsModule, type AbstractControl } from '@angular/forms';

import { ServiceCatalogCustomField } from '@fz-original/app/modules/admin-project-management-settings/models/service-catalog.model';
import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntStepperComponent } from '@ignite/legacy/components/ignt-stepper/ignt-stepper.component';
import { Step } from '@ignite/legacy/components/ignt-stepper/ignt.stepper.model';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { InformationRequestQuestion } from '../../models/information-request-question.model';
import {
  buildAnswersForm,
  buildAnswersSnapshot,
  buildQuestionControl,
  buildStepperInstanceControl,
  customFieldToQuestion,
  type IrAnswersForm,
  type IrStepperFormArray,
} from '../../models/ir-answers-form.util';
import { isAnswerPresent } from '../../models/question-answer.util';
import { StepperInstanceAnswer, StepperRefAnswerValue, StepperTemplate } from '../../models/stepper-template.model';
import { InformationRequestQuestionComponent } from '../information-request-question/information-request-question.component';
import { STEPPER_DEPTH, STEPPER_MAX_DEPTH } from './stepper-depth.token';
import { clearStepperDraft, readStepperDraft, stepperDraftKey, writeStepperDraft } from './stepper-drafts';

export interface StepperRefConfig {
  stepperTemplateKey: string;
  multiInstance: boolean;
}

interface WizardStep {
  index: number;
  title: string;
  questions: InformationRequestQuestion[];
}

let instanceCounter = 0;

@Component({
  selector: 'app-ir-stepper-ref-answer',
  templateUrl: './ir-stepper-ref-answer.component.html',
  styleUrls: ['./ir-stepper-ref-answer.component.scss'],
  imports: [
    CommonModule,
    TranslateModule,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntStepperComponent,
    ReactiveFormsModule,
    forwardRef(() => InformationRequestQuestionComponent),
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: STEPPER_DEPTH, useFactory: () => (inject(STEPPER_DEPTH, { skipSelf: true, optional: true }) ?? 0) + 1 }],
})
export class IrStepperRefAnswerComponent implements OnChanges {
  @Input({ required: true }) config!: StepperRefConfig;
  @Input() template: StepperTemplate | null = null;
  @Input() form: IrStepperFormArray | null = null;
  @Input() value: StepperRefAnswerValue | null = null;
  @Input() readOnly = false;
  @Input() testId = '';
  @Input() informationRequestId: string | null = null;

  @Output() valueChange = new EventEmitter<StepperRefAnswerValue>();

  readonly #depth = inject(STEPPER_DEPTH, { skipSelf: true, optional: true }) ?? 0;
  readonly #destroyRef = inject(DestroyRef);
  readonly nestingBlocked = this.#depth >= STEPPER_MAX_DEPTH;

  readonly instances = signal<StepperInstanceAnswer[]>([]);
  readonly editingInstanceId = signal<string | null>(null);
  readonly currentStep = signal<number>(0);
  readonly draftRestored = signal<boolean>(false);
  wizardForm: IrAnswersForm = buildAnswersForm([]);
  #wizardFormSubscription: Subscription | null = null;
  #formValueChangesSubscription: Subscription | null = null;

  readonly steps = computed<WizardStep[]>(() => {
    if (!this.template) return [];
    const fieldsById = new Map(this.template.customFields.map(f => [f.id, f]));
    return this.template.layout.sections.map((section, index) => {
      const questionIds = section.rows.flatMap(r => r.columns.flatMap(c => c));
      const questions = questionIds
        .map(id => fieldsById.get(id))
        .filter((f): f is ServiceCatalogCustomField => !!f)
        .map(this.#customFieldToQuestion);
      return { index, title: section.title, questions };
    });
  });

  readonly stepperSteps = computed<Step[]>(() =>
    this.steps().map(step => ({
      id: String(step.index),
      label: step.title,
      status: this.#stepStatus(step.index),
    })),
  );

  wizardReferencedTemplates: Record<string, StepperTemplate> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['template']) {
      this.wizardReferencedTemplates = this.template ? { [this.template.key]: this.template } : {};
    }
    if (changes['form']) {
      this.#formValueChangesSubscription?.unsubscribe();
      this.#formValueChangesSubscription =
        this.form?.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
          this.instances.set(this.#instancesFromForm());
        }) ?? null;
    }
    if (changes['form'] || changes['value'] || changes['config']) {
      this.instances.set(this.form ? this.#instancesFromForm() : this.#normalize(this.value));
    }
  }

  isMultiInstance(): boolean {
    return !!this.config?.multiInstance;
  }

  instanceLabel(instance: StepperInstanceAnswer, index: number): string {
    if (!this.template) return `#${index + 1}`;
    const first = this.template.customFields.find(f => Object.prototype.hasOwnProperty.call(instance.answers, f.id));
    const value = first ? instance.answers[first.id] : null;
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
    return `#${index + 1}`;
  }

  startAddInstance(): void {
    if (this.readOnly || this.nestingBlocked || !this.template) return;
    const newId = `stp-${Date.now()}-${++instanceCounter}`;
    this.#openWizard(newId, {});
  }

  startEditInstance(instanceId: string): void {
    if (this.readOnly || this.nestingBlocked) return;
    const found = this.instances().find(i => i.instanceId === instanceId);
    if (!found) return;
    this.#openWizard(instanceId, { ...found.answers });
  }

  removeInstance(instanceId: string): void {
    if (this.readOnly) return;
    const next = this.instances().filter(i => i.instanceId !== instanceId);
    this.#commitInstances(next);
    this.#clearDraftFor(instanceId);
  }

  cancelWizard(): void {
    const id = this.editingInstanceId();
    if (id) this.#clearDraftFor(id);
    this.editingInstanceId.set(null);
    this.#setWizardForm({});
    this.currentStep.set(0);
    this.draftRestored.set(false);
  }

  saveWizard(): void {
    const id = this.editingInstanceId();
    if (!id) return;
    const next = this.#upsertInstance(this.instances(), { instanceId: id, answers: this.wizardAnswers() });
    this.#commitInstances(next);
    this.#clearDraftFor(id);
    this.editingInstanceId.set(null);
    this.#setWizardForm({});
    this.currentStep.set(0);
    this.draftRestored.set(false);
  }

  goPrevious(): void {
    this.currentStep.update(s => Math.max(0, s - 1));
    this.#persistDraft();
  }

  goNext(): void {
    const total = this.steps().length;
    this.currentStep.update(s => Math.min(total - 1, s + 1));
    this.#persistDraft();
  }

  onInnerAnswer(questionId: string, value: unknown): void {
    const control = this.wizardForm.controls[questionId];
    if (!control) {
      return;
    }
    const question = this.steps()
      .flatMap(step => step.questions)
      .find(stepQuestion => stepQuestion.id === questionId);
    if (control instanceof FormGroup && value && typeof value === 'object' && !Array.isArray(value)) {
      control.patchValue(value as Record<string, unknown>);
      control.markAsDirty();
      control.updateValueAndValidity();
      this.wizardForm.markAsDirty();
      this.wizardForm.updateValueAndValidity();
      this.#persistDraft();
      return;
    }
    if (question && control instanceof FormArray && Array.isArray(value)) {
      const nextControl = buildQuestionControl(
        { ...question, answer: value },
        { referencedStepperTemplates: this.template ? { [this.template.key]: this.template } : {} },
      );
      this.wizardForm.setControl(questionId, nextControl);
      nextControl.markAsDirty();
      nextControl.updateValueAndValidity();
      this.wizardForm.markAsDirty();
      this.wizardForm.updateValueAndValidity();
      this.#persistDraft();
      return;
    }
    control.setValue(value);
    control.markAsDirty();
    control.updateValueAndValidity();
  }

  discardDraftBanner(): void {
    this.draftRestored.set(false);
  }

  isStepValid(step: WizardStep): boolean {
    const answers = this.wizardAnswers();
    return step.questions.every(question => !question.required || isAnswerPresent(question.type, answers[question.id]));
  }

  canAdvance(): boolean {
    const steps = this.steps();
    const idx = this.currentStep();
    return idx < steps.length - 1 && this.isStepValid(steps[idx]);
  }

  canFinish(): boolean {
    return this.steps().every(s => this.isStepValid(s));
  }

  controlFor(questionId: string): AbstractControl {
    return this.wizardForm.controls[questionId];
  }

  wizardAnswers(): Record<string, unknown> {
    return buildAnswersSnapshot(
      this.steps().flatMap(step => step.questions),
      this.wizardForm,
      {
        referencedStepperTemplates: this.template ? { [this.template.key]: this.template } : {},
      },
    );
  }

  #emit(instances: StepperInstanceAnswer[]): void {
    if (this.isMultiInstance()) {
      this.valueChange.emit(instances);
    } else {
      this.valueChange.emit(instances[0] ?? { instanceId: 'single', answers: {} });
    }
  }

  #commitInstances(instances: StepperInstanceAnswer[]): void {
    this.instances.set(instances);
    if (this.form && this.template) {
      this.form.clear();
      instances.forEach(instance => this.form?.push(buildStepperInstanceControl(instance, this.template!)));
      this.form.markAsDirty();
      this.form.updateValueAndValidity();
    }
    this.#emit(instances);
  }

  #normalize(value: StepperRefAnswerValue | null): StepperInstanceAnswer[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  #instancesFromForm(): StepperInstanceAnswer[] {
    const questions = this.template?.customFields.map(this.#customFieldToQuestion) ?? [];
    return (this.form?.controls ?? []).map((group, index) => ({
      answers: buildAnswersSnapshot(questions, group.controls.answers, {
        referencedStepperTemplates: this.template ? { [this.template.key]: this.template } : {},
      }),
      instanceId: group.controls.instanceId.value || `stp-${index}`,
    }));
  }

  #upsertInstance(list: StepperInstanceAnswer[], next: StepperInstanceAnswer): StepperInstanceAnswer[] {
    const idx = list.findIndex(i => i.instanceId === next.instanceId);
    if (idx < 0) return [...list, next];
    const copy = [...list];
    copy[idx] = next;
    return copy;
  }

  #openWizard(instanceId: string, initialAnswers: Record<string, unknown>): void {
    this.editingInstanceId.set(instanceId);
    const draft = this.informationRequestId
      ? readStepperDraft(stepperDraftKey(this.informationRequestId, this.config.stepperTemplateKey, instanceId))
      : null;
    if (draft) {
      this.#setWizardForm({ ...initialAnswers, ...draft.answers });
      this.currentStep.set(Math.min(draft.currentStep, Math.max(0, this.steps().length - 1)));
      this.draftRestored.set(true);
    } else {
      this.#setWizardForm(initialAnswers);
      this.currentStep.set(0);
      this.draftRestored.set(false);
    }
  }

  #setWizardForm(answers: Record<string, unknown>): void {
    const questions = this.steps().flatMap(step => step.questions.map(question => ({ ...question, answer: answers[question.id] })));
    this.#wizardFormSubscription?.unsubscribe();
    this.wizardForm = buildAnswersForm(questions, {
      referencedStepperTemplates: this.template ? { [this.template.key]: this.template } : {},
    });
    this.#wizardFormSubscription = this.wizardForm.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#persistDraft();
    });
  }

  #persistDraft(): void {
    const id = this.editingInstanceId();
    if (!id || !this.informationRequestId) return;
    writeStepperDraft(stepperDraftKey(this.informationRequestId, this.config.stepperTemplateKey, id), {
      v: 1,
      currentStep: this.currentStep(),
      answers: this.wizardAnswers(),
    });
  }

  #clearDraftFor(instanceId: string): void {
    if (!this.informationRequestId) return;
    clearStepperDraft(stepperDraftKey(this.informationRequestId, this.config.stepperTemplateKey, instanceId));
  }

  #stepStatus(index: number): Step['status'] {
    const current = this.currentStep();
    if (index < current) return 'completed';
    if (index === current) return 'active';
    return 'started';
  }

  #customFieldToQuestion = (field: ServiceCatalogCustomField): InformationRequestQuestion => customFieldToQuestion(field, undefined);
}
