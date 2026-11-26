import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';

import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { startWith, switchMap } from 'rxjs';

import { ContentQuestion, contentQuestionOptionKeys } from '../../../../../models/content-questions.model';
import { ContentQuestionExtraComponent } from '../content-question-extra/content-question-extra.component';
import {
  contentOptionTranslationKey,
  ContentQuestionControl,
  contentQuestionsTranslationPrefix,
  ContentSingleAnswerGroup,
  resolveContentAnswerShape,
  resolveSingleExtraMode,
} from '../content-questions.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContentQuestionExtraComponent, MultiSelectModule, TranslateModule],
  selector: 'app-content-question-single-select',
  styleUrl: './content-question-single-select.component.scss',
  templateUrl: './content-question-single-select.component.html',
})
export class ContentQuestionSingleSelectComponent {
  readonly #translate = inject(TranslateService);

  readonly control = input.required<ContentQuestionControl>();
  readonly fieldId = input.required<string>();
  readonly question = input.required<ContentQuestion>();

  /** Null for the plain single select, whose control is the option itself and which never asks for a free value. */
  readonly #answerGroup = computed((): ContentSingleAnswerGroup | null =>
    resolveContentAnswerShape(this.question().type) === 'single' ? (this.control() as ContentSingleAnswerGroup) : null,
  );

  protected readonly extraControl = computed((): FormControl<string> | null => this.#answerGroup()?.controls.extra ?? null);
  protected readonly optionControl = computed(
    (): FormControl<string> => this.#answerGroup()?.controls.option ?? (this.control() as FormControl<string>),
  );

  readonly #optionValue = toSignal(
    toObservable(this.optionControl).pipe(switchMap(control => control.valueChanges.pipe(startWith(control.value)))),
    { initialValue: '' },
  );

  protected readonly extraMode = computed(() => resolveSingleExtraMode(this.question(), this.#optionValue()));
  protected readonly selectOptions = computed((): SelectOption[] =>
    contentQuestionOptionKeys(this.question()).map(optionKey => ({
      id: optionKey,
      title: this.#translate.instant(contentOptionTranslationKey(optionKey)),
    })),
  );
  protected readonly selectedOptions = computed((): SelectOption[] => {
    const optionKey = this.#optionValue();
    const option = optionKey.length === 0 ? undefined : this.selectOptions().find(candidate => candidate.id === optionKey);

    return option === undefined ? [] : [option];
  });
  protected readonly selectPlaceholderTranslationKey = `${contentQuestionsTranslationPrefix}.selectPlaceholder`;

  protected onOptionsSelected(options: SelectOption[]): void {
    const control = this.optionControl();

    control.setValue(options[0]?.id?.toString() ?? '');
    control.markAsDirty();
    control.markAsTouched();
  }
}
