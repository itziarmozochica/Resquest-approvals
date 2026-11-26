import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  EventEmitter,
  inject,
  input,
  output,
  Output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, type AbstractControl } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { InformationRequestQuestion, InformationRequestQuestionType } from '../../models/information-request-question.model';
import { buildAnswersSnapshot, buildTableRowControl, type IrAnswersForm } from '../../models/ir-answers-form.util';
import { IrFieldAction, IrFieldEditingState } from '../../models/ir-field-editing.model';
import { IrFormLayout, IrFormLayoutRow, IrFormLayoutSection } from '../../models/ir-form-layout.model';
import { isAnswerPresent } from '../../models/question-answer.util';
import { StepperTemplate } from '../../models/stepper-template.model';
import { IrCatalogKeyPipe } from '../../pipes/ir-catalog-key.pipe';
import { InformationRequestQuestionComponent } from '../information-request-question/information-request-question.component';
import { IrQuestionFieldActionsComponent } from '../ir-question-field-actions/ir-question-field-actions.component';

const FULL_WIDTH_TYPES = new Set<InformationRequestQuestionType>([
  InformationRequestQuestionType.TICKET_TYPES,
  InformationRequestQuestionType.VENUE,
  InformationRequestQuestionType.FAQ,
  InformationRequestQuestionType.CATALOG_GRID,
]);

export interface IrFormSectionStatus {
  requiredCount: number;
  answeredCount: number;
  complete: boolean;
}

export interface IrFormSectionGroup {
  title: string;
  questions: InformationRequestQuestion[];
}

@Component({
  selector: 'app-ir-form-layout',
  templateUrl: './ir-form-layout.component.html',
  styleUrls: ['./ir-form-layout.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    IrCatalogKeyPipe,
    InformationRequestQuestionComponent,
    IrQuestionFieldActionsComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IrFormLayoutComponent {
  readonly form = input.required<IrAnswersForm>();
  readonly questions = input<InformationRequestQuestion[]>([]);
  readonly layout = input<IrFormLayout | null>(null);
  readonly partnerId = input<number | null>(null);
  readonly launchId = input<string | null>(null);
  readonly informationRequestId = input<string | null>(null);
  readonly referencedStepperTemplates = input<Record<string, StepperTemplate>>({});
  readonly fieldEditing = input<IrFieldEditingState | null>(null);
  readonly locked = input<boolean>(false);

  @Output() fileUploaded = new EventEmitter<string>();
  @Output() activeSectionChange = new EventEmitter<string | null>();
  readonly fieldAction = output<IrFieldAction>();

  activeSectionIndex = 0;

  readonly #cdr = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #questionById = computed(() => new Map(this.questions().map(question => [question.id, question])));
  readonly #sectionGroups = computed(() => this.#deriveSectionGroups(this.questions()));
  readonly #formVersion = signal(0);
  readonly #answersById = computed(() => {
    this.#formVersion();
    return buildAnswersSnapshot(this.questions(), this.form(), { referencedStepperTemplates: this.referencedStepperTemplates() });
  });

  #previousLayout: IrFormLayout | null | undefined = undefined;
  #previousQuestions: InformationRequestQuestion[] | undefined = undefined;

  constructor() {
    effect(onCleanup => {
      const subscription = this.form()
        .valueChanges.pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => {
          this.#formVersion.update(version => version + 1);
          this.#cdr.markForCheck();
        });
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      const layout = this.layout();
      const questions = this.questions();
      const layoutChanged = layout !== this.#previousLayout;
      const questionsChanged = questions !== this.#previousQuestions;

      if (layoutChanged) {
        this.activeSectionIndex = 0;
      }
      if (layoutChanged || questionsChanged) {
        this.activeSectionChange.emit(this.#activeSectionTitle());
      }

      this.#previousLayout = layout;
      this.#previousQuestions = questions;
    });
  }

  hasLayout(): boolean {
    const layout = this.layout();
    return !!layout && layout.sections.length > 0;
  }

  /** When there is no explicit layout, tabs are derived from the questions' `section` field. */
  hasSectionTabs(): boolean {
    return !this.hasLayout() && this.sectionGroups().length >= 2;
  }

  sectionGroups(): IrFormSectionGroup[] {
    return this.#sectionGroups();
  }

  activeGroup(): IrFormSectionGroup | null {
    return this.sectionGroups()[this.activeSectionIndex] ?? null;
  }

  #activeSectionTitle(): string | null {
    if (this.hasLayout()) {
      return this.activeSection()?.title ?? null;
    }
    if (this.hasSectionTabs()) {
      return this.activeGroup()?.title ?? null;
    }
    return null;
  }

  groupStatus(group: IrFormSectionGroup): IrFormSectionStatus {
    let requiredCount = 0;
    let answeredCount = 0;
    for (const question of group.questions) {
      if (question.required) {
        requiredCount++;
        if (isAnswerPresent(question.type, this.answersById()[question.id])) {
          answeredCount++;
        }
      }
    }
    return { requiredCount, answeredCount, complete: requiredCount > 0 && answeredCount === requiredCount };
  }

  activeSection(): IrFormLayoutSection | null {
    const sections = this.layout()?.sections ?? [];
    return sections[this.activeSectionIndex] ?? null;
  }

  selectSection(index: number): void {
    this.activeSectionIndex = index;
    this.activeSectionChange.emit(this.#activeSectionTitle());
  }

  onTabKeydown(event: KeyboardEvent, index: number): void {
    const count = this.hasLayout() ? (this.layout()?.sections.length ?? 0) : this.sectionGroups().length;
    if (count <= 1) {
      return;
    }
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % count;
        break;
      case 'ArrowLeft':
        next = (index - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.activeSectionIndex = next;
    this.activeSectionChange.emit(this.#activeSectionTitle());
    const tabs = (event.currentTarget as HTMLElement).parentElement?.children;
    (tabs?.[next] as HTMLElement | undefined)?.focus();
  }

  sectionStatus(section: IrFormLayoutSection): IrFormSectionStatus {
    let requiredCount = 0;
    let answeredCount = 0;
    for (const row of section.rows) {
      for (const column of row.columns) {
        for (const id of column) {
          const question = this.questionById(id);
          if (question?.required) {
            requiredCount++;
            if (isAnswerPresent(question.type, this.answersById()[question.id])) {
              answeredCount++;
            }
          }
        }
      }
    }
    return { requiredCount, answeredCount, complete: requiredCount > 0 && answeredCount === requiredCount };
  }

  questionById(id: string): InformationRequestQuestion | undefined {
    return this.#questionById().get(id);
  }

  isFullWidth(type: InformationRequestQuestionType): boolean {
    return FULL_WIDTH_TYPES.has(type);
  }

  columnHasVisibleQuestions(column: string[]): boolean {
    return column.some(id => !!this.questionById(id));
  }

  rowColumns(row: IrFormLayoutRow): number {
    const visibleColumns = row.columns.filter(column => this.columnHasVisibleQuestions(column));
    const collapsed = visibleColumns.some(column =>
      column.some(id => {
        const question = this.questionById(id);
        return !!question && this.isFullWidth(question.type);
      }),
    );
    return collapsed ? 1 : Math.max(1, visibleColumns.length);
  }

  controlFor(questionId: string): AbstractControl {
    return this.form().controls[questionId];
  }

  onSiblingAnswer(questionId: string, value: unknown): void {
    const control = this.form().controls[questionId];
    if (!control) {
      return;
    }
    if (control instanceof FormGroup && value && typeof value === 'object' && !Array.isArray(value)) {
      // Whole-value semantics: keys missing from the sibling answer reset to null instead of keeping stale values.
      const record = value as Record<string, unknown>;
      control.setValue(Object.fromEntries(Object.keys(control.controls).map(key => [key, record[key] ?? null])));
    } else if (control instanceof FormArray && Array.isArray(value)) {
      while (control.length > value.length) {
        control.removeAt(control.length - 1, { emitEvent: false });
      }
      while (control.length < value.length) {
        const row = value[control.length];
        const rowRecord = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : null;
        control.push(rowRecord ? buildTableRowControl(rowRecord, Object.keys(rowRecord)) : new FormControl(row), { emitEvent: false });
      }
      control.patchValue(value);
    } else {
      control.setValue(value);
    }
    control.markAsDirty();
    control.updateValueAndValidity();
  }

  answersById(): Record<string, unknown> {
    return this.#answersById();
  }

  #deriveSectionGroups(questions: InformationRequestQuestion[]): IrFormSectionGroup[] {
    // Only tab when every question is sectioned, so the flat fallback never drops a question.
    if (questions.length === 0 || questions.some(question => question.section == null)) {
      return [];
    }
    const order: string[] = [];
    const bySection = new Map<string, InformationRequestQuestion[]>();
    for (const question of questions) {
      const key = question.section as string;
      if (!bySection.has(key)) {
        bySection.set(key, []);
        order.push(key);
      }
      bySection.get(key)!.push(question);
    }
    return order.map(title => ({ title, questions: bySection.get(title)! }));
  }
}
