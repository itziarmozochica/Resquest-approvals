import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { type AbstractControl } from '@angular/forms';

import { IgntButtonComponent, IgntPillButtonComponent, type IgntButtonIcon } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { InformationRequestQuestion } from '../../models/information-request-question.model';
import { buildDisabledPreviewControl } from '../../models/ir-answers-form.util';
import { effectiveRequired, IrFieldAction, IrFieldEditingState } from '../../models/ir-field-editing.model';
import { groupBySection, QuestionSectionGroup } from '../../models/question-section-grouping.util';
import { InformationRequestQuestionComponent } from '../information-request-question/information-request-question.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntButtonComponent, IgntPillButtonComponent, InformationRequestQuestionComponent],
  selector: 'app-ir-available-questions',
  standalone: true,
  styleUrls: ['./ir-available-questions.component.scss'],
  templateUrl: './ir-available-questions.component.html',
})
export class IrAvailableQuestionsComponent {
  readonly questions = input.required<InformationRequestQuestion[]>();
  readonly state = input.required<IrFieldEditingState>();

  readonly action = output<IrFieldAction>();

  readonly addIcon: IgntButtonIcon = { name: 'plus', variant: 'light' };
  readonly collapseIcon: IgntButtonIcon = { name: 'chevron-up', variant: 'light' };
  readonly expandIcon: IgntButtonIcon = { name: 'chevron-down', variant: 'light' };
  readonly expanded = signal<boolean>(false);
  readonly groups = computed<QuestionSectionGroup[]>(() => groupBySection(this.questions()));

  readonly #previewControls = new Map<string, AbstractControl>();

  toggleExpanded(): void {
    this.expanded.set(!this.expanded());
  }

  /** Cached per question, and never built while the section is collapsed. */
  previewControl(question: InformationRequestQuestion): AbstractControl {
    const cached = this.#previewControls.get(question.id);
    if (cached) {
      return cached;
    }
    const control = buildDisabledPreviewControl(question);
    this.#previewControls.set(question.id, control);
    return control;
  }

  isPendingAdd(questionId: string): boolean {
    return this.state().pendingAdd.includes(questionId);
  }

  required(question: InformationRequestQuestion): boolean {
    return effectiveRequired(question, this.state());
  }

  add(question: InformationRequestQuestion): void {
    this.action.emit({ questionId: question.id, type: 'add' });
  }

  undoAdd(question: InformationRequestQuestion): void {
    this.action.emit({ questionId: question.id, type: 'undoAdd' });
  }

  setRequired(question: InformationRequestQuestion, required: boolean): void {
    this.action.emit({ questionId: question.id, required, type: 'required' });
  }
}
