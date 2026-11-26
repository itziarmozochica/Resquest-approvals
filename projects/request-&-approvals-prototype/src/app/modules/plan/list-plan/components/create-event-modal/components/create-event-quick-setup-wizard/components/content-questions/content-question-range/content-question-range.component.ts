import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { ContentQuestionControl, contentQuestionsTranslationPrefix, ContentRangeAnswerGroup } from '../content-questions.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntInputFieldComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-content-question-range',
  styleUrl: './content-question-range.component.scss',
  templateUrl: './content-question-range.component.html',
})
export class ContentQuestionRangeComponent {
  readonly control = input.required<ContentQuestionControl>();
  readonly fieldId = input.required<string>();

  protected readonly maxControl = computed(() => (this.control() as ContentRangeAnswerGroup).controls.max);
  protected readonly maxPlaceholderTranslationKey = `${contentQuestionsTranslationPrefix}.maxPlaceholder`;
  protected readonly minControl = computed(() => (this.control() as ContentRangeAnswerGroup).controls.min);
  protected readonly minPlaceholderTranslationKey = `${contentQuestionsTranslationPrefix}.minPlaceholder`;
}
