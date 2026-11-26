import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { startWith, switchMap } from 'rxjs';

import { ContentQuestion, contentQuestionOptionKeys } from '../../../../../models/content-questions.model';
import { ContentQuestionExtraComponent } from '../content-question-extra/content-question-extra.component';
import {
  ContentMultiAnswerGroup,
  contentOptionTranslationKey,
  ContentQuestionControl,
  contentQuestionsTranslationPrefix,
  resolveMultiExtraMode,
} from '../content-questions.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContentQuestionExtraComponent, IgntButtonComponent, IgntIconComponent, MultiSelectModule, TranslateModule],
  selector: 'app-content-question-multi-select',
  styleUrl: './content-question-multi-select.component.scss',
  templateUrl: './content-question-multi-select.component.html',
})
export class ContentQuestionMultiSelectComponent {
  readonly #translate = inject(TranslateService);

  readonly control = input.required<ContentQuestionControl>();
  readonly fieldId = input.required<string>();
  readonly question = input.required<ContentQuestion>();

  readonly #answerGroup = computed(() => this.control() as ContentMultiAnswerGroup);

  protected readonly extraControl = computed(() => this.#answerGroup().controls.extra);
  protected readonly optionsControl = computed(() => this.#answerGroup().controls.options);

  readonly #optionsValue = toSignal(
    toObservable(this.optionsControl).pipe(switchMap(control => control.valueChanges.pipe(startWith(control.value)))),
    { initialValue: [] as string[] },
  );

  protected readonly extraMode = computed(() => resolveMultiExtraMode(this.question(), this.#optionsValue()));
  protected readonly selectOptions = computed((): SelectOption[] =>
    contentQuestionOptionKeys(this.question()).map(optionKey => ({
      id: optionKey,
      title: this.#translate.instant(contentOptionTranslationKey(optionKey)),
    })),
  );
  protected readonly selectedOptions = computed((): SelectOption[] => {
    const selectedIds = new Set(this.#optionsValue());

    return this.selectOptions().filter(option => selectedIds.has(String(option.id)));
  });
  protected readonly selectedSummaryText = computed((): string | null => {
    const count = this.#optionsValue().length;

    return count === 0 ? null : this.#translate.instant(`${contentQuestionsTranslationPrefix}.selectedCount`, { count });
  });
  protected readonly selectPlaceholderTranslationKey = `${contentQuestionsTranslationPrefix}.selectPlaceholder`;

  protected onOptionsSelected(options: SelectOption[]): void {
    this.#writeOptions(options.map(option => String(option.id)));
  }

  protected optionId(option: SelectOption): string {
    return String(option.id);
  }

  protected optionTranslationKey(optionKey: string): string {
    return contentOptionTranslationKey(optionKey);
  }

  protected removeOption(optionId: string): void {
    this.#writeOptions(this.optionsControl().value.filter(selectedId => selectedId !== optionId));
  }

  #writeOptions(optionKeys: string[]): void {
    const control = this.optionsControl();

    control.setValue(optionKeys);
    control.markAsDirty();
    control.markAsTouched();
  }
}
