import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { ContentQuestionExtraMode, contentQuestionsTranslationPrefix } from '../content-questions.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntInputFieldComponent, IgntTextareaFieldComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-content-question-extra',
  styleUrl: './content-question-extra.component.scss',
  templateUrl: './content-question-extra.component.html',
})
export class ContentQuestionExtraComponent {
  readonly control = input.required<FormControl<string>>();
  readonly fieldId = input.required<string>();
  readonly mode = input.required<ContentQuestionExtraMode>();

  protected readonly inputType = computed((): 'number' | 'text' => (this.mode() === 'number' ? 'number' : 'text'));
  protected readonly isMultiline = computed(() => this.mode() === 'multiline');
  protected readonly openTextPlaceholderTranslationKey = `${contentQuestionsTranslationPrefix}.openTextPlaceholder`;
  protected readonly specifyPlaceholderTranslationKey = `${contentQuestionsTranslationPrefix}.specifyPlaceholder`;
}
