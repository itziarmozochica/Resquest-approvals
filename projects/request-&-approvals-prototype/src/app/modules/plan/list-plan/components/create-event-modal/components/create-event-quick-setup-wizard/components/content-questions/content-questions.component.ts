import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';

import { isEmptyRichTextHtml } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-content.utils';
import { RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { TranslateService } from '@ngx-translate/core';
import { merge, Subscription, type Observable } from 'rxjs';

import { ContentQuestionsCatalogService } from '../../../../models/content-questions-catalog/content-questions-catalog.service';
import { ContentCategoryId, ContentQuestion, ContentQuestionsValue } from '../../../../models/content-questions.model';
import { buildQuickSetupDefaultDescriptionHtml } from '../../utils/quick-setup-default-description.util';
import { ContentQuestionFieldComponent } from './content-question-field/content-question-field.component';
import {
  attachContentRangeValidators,
  buildContentQuestionsDescription,
  ContentQuestionControl,
  ContentQuestionField,
  contentQuestionsTranslationPrefix,
  ContentRangeAnswerGroup,
  createContentQuestionControl,
  createContentQuestionValidator,
  isContentQuestionRequiredNow,
  mapContentQuestionAnswer,
  resolveContentAnswerShape,
  splitContentQuestionLayoutColumns,
} from './content-questions.util';

type OnChangeFn = (value: ContentQuestionsValue) => void;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContentQuestionFieldComponent],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContentQuestionsComponent),
    },
    {
      multi: true,
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ContentQuestionsComponent),
    },
  ],
  selector: 'app-content-questions',
  styleUrl: './content-questions.component.scss',
  templateUrl: './content-questions.component.html',
})
export class ContentQuestionsComponent implements ControlValueAccessor, Validator {
  readonly #catalogService = inject(ContentQuestionsCatalogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);
  readonly #translate = inject(TranslateService);

  readonly category = input.required<ContentCategoryId>();
  readonly descriptionEditorFeatures = input(RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES);
  readonly descriptionImageUpload = input<((file: File) => Observable<string>) | null>(null);

  readonly #formRevision = signal(0);
  readonly #questions = signal<readonly ContentQuestion[]>([this.#catalogService.descriptionQuestion]);
  readonly #showValidationErrors = signal(false);
  #formChanges: Subscription | undefined;
  #isWritingValue = false;
  #onChange: OnChangeFn | undefined;
  #onTouched: (() => void) | undefined;
  #onValidatorChange: (() => void) | undefined;

  protected form: FormGroup = this.#buildForm([this.#catalogService.descriptionQuestion]);
  protected readonly fields = computed<ContentQuestionField[]>(() => {
    this.#formRevision();
    const showValidationErrors = this.#showValidationErrors();

    return this.#questions().map(question => {
      const control = this.form.controls[question.key] as ContentQuestionControl;

      return {
        control,
        hasError: control.invalid && (control.touched || showValidationErrors),
        isRequired: isContentQuestionRequiredNow(question, control),
        question,
      };
    });
  });
  protected readonly layoutColumns = computed((): readonly [ContentQuestionField[], ContentQuestionField[]] =>
    splitContentQuestionLayoutColumns(this.fields(), this.#catalogService.descriptionQuestion.key),
  );

  constructor() {
    effect(() => {
      const categoryId = this.category();

      untracked(() => this.#rebuildForCategory(categoryId));
    });
  }

  markFormAsTouched(): void {
    this.form.markAllAsTouched();
    this.#showValidationErrors.set(true);
    this.#onTouched?.();
    this.#formRevision.update(revision => revision + 1);
  }

  registerOnChange(fn: OnChangeFn): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.#onValidatorChange = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.form.disabled === isDisabled) {
      return;
    }

    if (isDisabled) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  validate(): ValidationErrors | null {
    return this.form.disabled || this.form.valid ? null : { invalidContentQuestions: true };
  }

  writeValue(value: ContentQuestionsValue | null): void {
    if (value !== null) {
      return;
    }

    this.#isWritingValue = true;

    try {
      this.form.reset(undefined, { emitEvent: false });
      this.#setDefaultDescriptionValue();
      this.form.updateValueAndValidity({ emitEvent: false });
      this.#formRevision.update(revision => revision + 1);
    } finally {
      this.#isWritingValue = false;
    }
  }

  #buildForm(questions: readonly ContentQuestion[]): FormGroup {
    const form = this.#formBuilder.group(
      Object.fromEntries(
        questions.map(question => {
          const control = createContentQuestionControl(this.#formBuilder, question);

          if (question.key === this.#catalogService.descriptionQuestion.key && resolveContentAnswerShape(question.type) === 'rich_text') {
            this.#setDefaultDescriptionOnControl(control as FormControl<string>);
          }

          if (resolveContentAnswerShape(question.type) === 'range') {
            attachContentRangeValidators(control as ContentRangeAnswerGroup, this.#destroyRef);
          }

          control.addValidators(createContentQuestionValidator(question));
          control.updateValueAndValidity({ emitEvent: false });

          return [question.key, control];
        }),
      ),
    );

    this.#formChanges?.unsubscribe();
    this.#formChanges = merge(form.statusChanges, form.valueChanges)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#onFormChanged());

    return form;
  }

  #mapValue(): ContentQuestionsValue {
    const category = this.#catalogService.findCategoryById(this.category()) ?? null;

    return buildContentQuestionsDescription({
      description: this.#readDescription(),
      descriptionQuestionKey: this.#catalogService.descriptionQuestion.key,
      metadata: {
        categoryLabel:
          category === null ? undefined : this.#translate.instant(`${contentQuestionsTranslationPrefix}.categories.${category.labelKey}`),
      },
      questions: this.#questions(),
      readAnswer: question => {
        if (question.key === this.#catalogService.descriptionQuestion.key) {
          return undefined;
        }

        return mapContentQuestionAnswer(question, this.form.controls[question.key] as ContentQuestionControl);
      },
      translate: key => this.#translate.instant(key),
    });
  }

  #onFormChanged(): void {
    this.#refreshConditionalValidity();
    this.#formRevision.update(revision => revision + 1);
    this.#onValidatorChange?.();

    if (!this.#isWritingValue) {
      this.#onChange?.(this.#mapValue());
    }
  }

  #readDescription(): string {
    return String(this.form.controls[this.#catalogService.descriptionQuestion.key]?.getRawValue() ?? '');
  }

  #rebuildForCategory(categoryId: ContentCategoryId): void {
    const category = this.#catalogService.findCategoryById(categoryId) ?? null;
    const questions: readonly ContentQuestion[] = [this.#catalogService.descriptionQuestion, ...(category?.questions ?? [])];
    const description = this.#readDescription();
    const wasDisabled = this.form.disabled;

    this.#questions.set(questions);
    this.form = this.#buildForm(questions);

    if (!isEmptyRichTextHtml(description)) {
      this.#writeDescription(description);
    }

    this.#showValidationErrors.set(false);

    if (wasDisabled) {
      this.form.disable({ emitEvent: false });
    }

    this.#onFormChanged();
  }

  #refreshConditionalValidity(): void {
    this.#questions()
      .filter(question => question.requiredWhen.kind === 'condition')
      .forEach(question => this.form.controls[question.key]?.updateValueAndValidity({ emitEvent: false }));
  }

  #setDefaultDescriptionOnControl(control: FormControl<string>): void {
    control.setValue(
      buildQuickSetupDefaultDescriptionHtml(key => this.#translate.instant(key)),
      { emitEvent: false },
    );
  }

  #setDefaultDescriptionValue(): void {
    const { descriptionQuestion } = this.#catalogService;

    if (descriptionQuestion.type !== 'rich_text') {
      return;
    }

    const control = this.form.controls[descriptionQuestion.key] as FormControl<string> | undefined;

    if (control) {
      this.#setDefaultDescriptionOnControl(control);
    }
  }

  #writeDescription(description: string): void {
    this.form.controls[this.#catalogService.descriptionQuestion.key]?.setValue(description, { emitEvent: false });
  }
}
