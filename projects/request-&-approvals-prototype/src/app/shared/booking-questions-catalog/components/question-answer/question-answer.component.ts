import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  forwardRef,
  inject,
  input,
  LOCALE_ID,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
} from '@angular/forms';

import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IgntAlertComponent } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntInputFieldType } from '@ignite/legacy/models/ignt-input.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { BookingQuestionAnswerFile, ChoiceAdditionalQuestionAnswer } from '../../models/booking-question-answer.model';
import { CustomerQuestionType } from '../../models/customer-question-type.enum';
import { CustomerQuestion } from '../../models/customer-question.model';
import { emptyQuestionAnswerValue, isSameQuestionAnswerValue, QuestionAnswerValue } from '../../models/question-answer-value.model';
import { isAnswerEditable } from '../../utils/question-answer-editability.util';
import { questionAnswerValidator } from '../../utils/question-answer-validation.util';
import { FollowUpField } from './models/follow-up-field.model';
import { QuestionAnswerFileComponent } from './question-answer-file/question-answer-file.component';
import {
  selectableChoices,
  selectedChoiceOptions,
  toChoiceOptions,
  toFollowUps,
  unsavableFollowUpChoiceError,
} from './utils/question-answer-choices.util';
import { buildAnswerErrorMessages, followUpRequiredError, withoutErrors } from './utils/question-answer-errors.util';
import { toTextInput, toTextValue } from './utils/question-answer-text.util';

const followUpFieldErrors = new Set(['followUpRequired']);
const followUpErrors = new Set(['followUpRequired', 'unexpectedFollowUp']);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntCheckboxComponent,
    IgntInputFieldComponent,
    NgTemplateOutlet,
    IgntTagComponent,
    IgntTypeaheadModule,
    MultiSelectModule,
    QuestionAnswerFileComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  providers: [
    { multi: true, provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => QuestionAnswerComponent) },
    { multi: true, provide: NG_VALIDATORS, useExisting: forwardRef(() => QuestionAnswerComponent) },
  ],
  selector: 'app-question-answer',
  styleUrl: './question-answer.component.scss',
  templateUrl: './question-answer.component.html',
})
export class QuestionAnswerComponent implements ControlValueAccessor, Validator {
  static readonly leadIconsByType: Partial<Record<CustomerQuestionType, [string, string]>> = {
    [CustomerQuestionType.DATE]: ['fal', 'calendar'],
    [CustomerQuestionType.TEL]: ['fal', 'phone'],
    [CustomerQuestionType.TIME]: ['fal', 'clock'],
  };
  static readonly textInputTypes: Partial<Record<CustomerQuestionType, IgntInputFieldType>> = {
    [CustomerQuestionType.DATE]: 'date',
    [CustomerQuestionType.EMAIL]: 'email',
    [CustomerQuestionType.NUMBER]: 'number',
    [CustomerQuestionType.TEL]: 'tel',
    [CustomerQuestionType.TIME]: 'time',
  };

  readonly #destroyRef = inject(DestroyRef);
  readonly #followUpControls = new Map<string, FormControl<string>>();
  readonly #locale = inject(LOCALE_ID);
  readonly #translate = inject(TranslateService);

  readonly question = input.required<CustomerQuestion>();
  /** Off for an answer a screen cannot take back, so emptying the field is refused instead of saved as a no-op. */
  readonly clearable = input(true, { transform: booleanAttribute });
  readonly editing = input(false, { transform: booleanAttribute });
  readonly file = input<BookingQuestionAnswerFile | null>(null);
  readonly inputId = input<string>('');
  readonly label = input<string>('');
  readonly optional = input(false, { transform: booleanAttribute });
  /** Seeds a read-only answer. Consumers that bind a form control leave it unset and write through it. */
  readonly value = input<QuestionAnswerValue | null>(null);
  /** The single-answer endpoint rejects a choice carrying a follow-up, so its screen opts out. */
  readonly withAdditionalQuestions = input(true, { transform: booleanAttribute });

  protected readonly lockIcon: [string, string] = ['fal', 'lock-keyhole'];

  protected readonly errorMessages = buildAnswerErrorMessages(key => String(this.#translate.instant(key)));
  protected readonly choiceError = computed<string | null>(() => {
    const errors = this.#answerErrors();
    if (!this.isEditing() || !errors) {
      return null;
    }

    const type = Object.keys(errors).find(key => key !== 'required');

    return this.errorMessages.find(message => message.type === type)?.message ?? null;
  });
  protected readonly followUpFields = signal<FollowUpField[]>([]);
  protected readonly textControl = new FormControl<string>('', { nonNullable: true });
  protected readonly types = CustomerQuestionType;

  readonly #answer = signal<QuestionAnswerValue>(emptyQuestionAnswerValue());
  readonly #disabled = signal(false);

  readonly #emptyLabel = computed<string>(() => String(this.#translate.instant('questionAnswer.noResponse')));
  protected readonly isAnswered = computed<boolean>(() => this.file() !== null || this.#answer().value.some(value => value.trim() !== ''));
  protected readonly isMissing = computed<boolean>(() => !this.isAnswered() && !this.optional());
  protected readonly emptyHelperText = computed<string>(() => (this.isAnswered() ? '' : this.#emptyLabel()));
  protected readonly isChecked = computed<boolean>(() => this.#answer().value[0] === 'true');
  protected readonly isEditable = computed<boolean>(() => isAnswerEditable(this.question().type));
  protected readonly isEditing = computed<boolean>(() => this.editing() && this.isEditable() && !this.#disabled());

  protected readonly leadIcon = computed<[string, string] | null>(
    () => QuestionAnswerComponent.leadIconsByType[this.question().type] ?? null,
  );
  protected readonly inputType = computed<IgntInputFieldType>(() =>
    this.isEditing() ? (QuestionAnswerComponent.textInputTypes[this.question().type] ?? 'text') : 'text',
  );

  protected readonly choiceOptions = computed<SelectOption[]>(() =>
    toChoiceOptions(selectableChoices(this.question().choices ?? [], this.withAdditionalQuestions()), this.#answer().value),
  );
  protected readonly selectedChoiceOptions = computed<SelectOption[]>(() =>
    selectedChoiceOptions(this.choiceOptions(), this.#answer().value),
  );
  protected readonly selectedChoiceOption = computed<SelectOption | undefined>(() => this.selectedChoiceOptions()[0]);

  protected readonly followUps = computed<ChoiceAdditionalQuestionAnswer[]>(() =>
    this.withAdditionalQuestions() ? toFollowUps(this.question().choices ?? [], this.#answer()) : [],
  );

  #onChange: (value: QuestionAnswerValue) => void = () => {};
  #onTouched: () => void = () => {};
  #onValidatorChange: () => void = () => {};

  constructor() {
    this.textControl.addValidators(() => this.#answerErrors());
    this.textControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(text => {
      this.#publish({ value: this.#asTextValue(text) });
    });

    effect(() => {
      const value = this.value();
      if (value) {
        untracked(() => this.#acceptValue(value));
      }
    });

    effect(() => {
      const followUps = this.followUps();
      untracked(() => this.#syncFollowUpFields(followUps));
    });

    effect(() => {
      this.isEditing();
      untracked(() => this.#writeControl(this.textControl, this.#asTextInput(this.#answer().value)));
    });

    effect(() => {
      this.question();
      this.optional();
      this.file();
      this.withAdditionalQuestions();
      untracked(() => this.#onValidatorChange());
    });
  }

  registerOnChange(fn: (value: QuestionAnswerValue) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.#onValidatorChange = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.#disabled.set(isDisabled);
    this.#setControlDisabled(this.textControl, isDisabled);
    this.#followUpControls.forEach(control => this.#setControlDisabled(control, isDisabled));
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (this.question().type === CustomerQuestionType.IMAGE && this.file() !== null) {
      return null;
    }

    const errors = questionAnswerValidator(this.question(), this.optional(), this.clearable())(control);

    if (this.withAdditionalQuestions()) {
      return errors;
    }

    return unsavableFollowUpChoiceError(this.question().choices ?? [], this.#answer().value) ?? withoutErrors(errors, followUpErrors);
  }

  writeValue(value: QuestionAnswerValue | null): void {
    const answer = value ?? emptyQuestionAnswerValue();
    this.#answer.set(answer);
    this.#writeControl(this.textControl, this.#asTextInput(answer.value));
  }

  /** Without the "Follow-up" tag there is nothing else naming this field, so an unset message cannot stay empty. */
  #followUpMessage(choice: string): string {
    const configured = (this.question().choices ?? []).find(candidate => candidate.label === choice)?.additionalQuestionMessage;

    return configured?.trim() || String(this.#translate.instant('questionAnswer.followUp'));
  }

  protected onChoiceSelected(option: SelectOption): void {
    this.#publishChoices([String(option.id)]);
  }

  protected onChoicesSelected(options: SelectOption[]): void {
    this.#publishChoices(options.map(option => String(option.id)));
  }

  #followUpControl(choice: string, text: string): FormControl<string> {
    const existing = this.#followUpControls.get(choice);
    if (existing) {
      this.#writeControl(existing, text);

      return existing;
    }

    const control = new FormControl<string>(text, { nonNullable: true });
    control.addValidators(() => followUpRequiredError(this.#errorsForAnswer(), this.#answer().additionalAnswers, choice));
    control.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => this.#publishFollowUp(choice, value));
    this.#followUpControls.set(choice, control);

    return control;
  }

  /** Safe: the validator reads nothing but `value`, and here it judges the answer, not a control. */
  #errorsForAnswer(): ValidationErrors | null {
    return questionAnswerValidator(this.question(), this.optional(), this.clearable())({ value: this.#answer() } as AbstractControl);
  }

  #publishChoices(value: string[]): void {
    const selected = new Set(value);

    this.#publish({ additionalAnswers: this.#answer().additionalAnswers.filter(entry => selected.has(entry.choice)), value });
  }

  #publish(change: Partial<QuestionAnswerValue>): void {
    const next: QuestionAnswerValue = { ...this.#answer(), ...change };
    this.#answer.set(next);
    this.#onChange(next);
    this.#onTouched();
    this.textControl.updateValueAndValidity({ emitEvent: false });
    this.#followUpControls.forEach(control => control.updateValueAndValidity({ emitEvent: false }));
  }

  #acceptValue(value: QuestionAnswerValue): void {
    if (isSameQuestionAnswerValue(this.#answer(), value)) {
      return;
    }

    this.writeValue(value);
  }

  #answerErrors(): ValidationErrors | null {
    const errors = this.#errorsForAnswer();

    if (!this.withAdditionalQuestions()) {
      return unsavableFollowUpChoiceError(this.question().choices ?? [], this.#answer().value) ?? withoutErrors(errors, followUpErrors);
    }

    return withoutErrors(errors, followUpFieldErrors);
  }

  #publishFollowUp(choice: string, text: string): void {
    const others = this.#answer().additionalAnswers.filter(entry => entry.choice !== choice);

    this.#publish({ additionalAnswers: text.trim() === '' ? others : others.concat({ answer: text, choice }) });
  }

  #setControlDisabled(control: FormControl<string>, isDisabled: boolean): void {
    if (isDisabled) {
      control.disable({ emitEvent: false });

      return;
    }

    control.enable({ emitEvent: false });
  }

  #syncFollowUpFields(followUps: ChoiceAdditionalQuestionAnswer[]): void {
    const current = new Set(followUps.map(entry => entry.choice));
    this.#followUpControls.forEach((_, choice) => {
      if (!current.has(choice)) {
        this.#followUpControls.delete(choice);
      }
    });

    this.followUpFields.set(
      followUps.map(entry => ({
        answer: entry.answer,
        choice: entry.choice,
        control: this.#followUpControl(entry.choice, entry.answer),
        message: this.#followUpMessage(entry.choice),
      })),
    );
  }

  #asTextInput(values: string[]): string {
    return toTextInput(this.question().type, values, this.isEditing(), this.#locale);
  }

  #asTextValue(text: string): string[] {
    return toTextValue(this.question().type, text, this.#answer().value[1] ?? '');
  }

  #writeControl(control: FormControl<string>, text: string): void {
    if (control.value !== text) {
      control.setValue(text, { emitEvent: false });
    }
  }
}
