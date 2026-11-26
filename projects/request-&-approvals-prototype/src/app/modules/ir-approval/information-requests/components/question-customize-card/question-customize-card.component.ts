import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormControl, type AbstractControl } from '@angular/forms';

import { IgntPillButtonComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { InformationRequestQuestion } from '../../models/information-request-question.model';
import { buildDisabledPreviewControl } from '../../models/ir-answers-form.util';
import { QuestionOverridePayload } from '../../services/information-requests.service';
import { InformationRequestQuestionComponent } from '../information-request-question/information-request-question.component';

type PillKind = 'required' | 'optional' | 'hide';

@Component({
  selector: 'app-question-customize-card',
  templateUrl: './question-customize-card.component.html',
  styleUrls: ['./question-customize-card.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, IgntButtonComponent, IgntPillButtonComponent, InformationRequestQuestionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionCustomizeCardComponent {
  readonly #question = signal<InformationRequestQuestion | null>(null);
  readonly #override = signal<QuestionOverridePayload | undefined>(undefined);

  @Input({ required: true }) set question(value: InformationRequestQuestion) {
    this.#question.set(value);
    this.previewControl.set(buildDisabledPreviewControl(value));
  }
  get question(): InformationRequestQuestion {
    return this.#question() as InformationRequestQuestion;
  }

  @Input() set override(value: QuestionOverridePayload | undefined) {
    this.#override.set(value);
  }
  get override(): QuestionOverridePayload | undefined {
    return this.#override();
  }

  @Output() requiredChange = new EventEmitter<boolean>();
  @Output() hiddenChange = new EventEmitter<boolean>();
  @Output() helpTextChange = new EventEmitter<string | null>();

  readonly hintExpanded = signal<boolean>(false);
  readonly hintDraft = signal<string>('');
  readonly previewControl = signal<AbstractControl>(new FormControl<unknown>({ disabled: true, value: null }));

  readonly activePill = computed<PillKind>(() => {
    const q = this.#question();
    const o = this.#override() ?? {};
    if (o.hidden === true) return 'hide';
    const required = o.required ?? q?.required ?? false;
    return required ? 'required' : 'optional';
  });

  readonly effectiveHelpText = computed<string>(() => {
    const q = this.#question();
    const o = this.#override();
    if (o && 'help_text' in o) {
      return o.help_text ?? '';
    }
    return q?.helpText ?? '';
  });

  readonly hasHint = computed<boolean>(() => this.effectiveHelpText().trim().length > 0);

  readonly requiredLocked = computed<boolean>(() => !!this.#question()?.requiredLocked);
  readonly removalLocked = computed<boolean>(() => !!this.#question()?.removalLocked);

  onRequiredPill(): void {
    if (this.requiredLocked() && this.activePill() !== 'required') {
      return;
    }
    if (this.activePill() === 'hide') {
      this.hiddenChange.emit(false);
    }
    if (this.activePill() !== 'required') {
      this.requiredChange.emit(true);
    }
  }

  onOptionalPill(): void {
    if (this.requiredLocked()) {
      return;
    }
    if (this.activePill() === 'hide') {
      this.hiddenChange.emit(false);
    }
    if (this.activePill() !== 'optional') {
      this.requiredChange.emit(false);
    }
  }

  onHidePill(): void {
    if (this.removalLocked()) {
      return;
    }
    if (this.activePill() !== 'hide') {
      this.hiddenChange.emit(true);
    }
  }

  toggleHint(): void {
    if (this.hintExpanded()) {
      this.hintExpanded.set(false);
      return;
    }
    this.hintDraft.set(this.effectiveHelpText());
    this.hintExpanded.set(true);
  }

  onHintInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.hintDraft.set(target?.value ?? '');
  }

  saveHint(): void {
    const value = this.hintDraft().trim();
    this.helpTextChange.emit(value.length === 0 ? null : value);
    this.hintExpanded.set(false);
  }

  cancelHint(): void {
    this.hintExpanded.set(false);
  }
}
