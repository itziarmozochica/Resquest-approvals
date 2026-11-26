import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { ContentQuestion } from '../../../../../models/content-questions.model';
import { ContentQuestionControl, contentQuestionsTranslationPrefix } from '../content-questions.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTextareaFieldComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-content-question-textarea',
  styleUrl: './content-question-textarea.component.scss',
  templateUrl: './content-question-textarea.component.html',
})
export class ContentQuestionTextareaComponent {
  readonly control = input.required<ContentQuestionControl>();
  readonly fieldId = input.required<string>();
  readonly question = input.required<ContentQuestion>();

  protected readonly isStructured = computed(() => this.question().type === 'structured_open_text');
  protected readonly placeholderTranslationKey = computed(() =>
    this.isStructured()
      ? `${contentQuestionsTranslationPrefix}.structuredOpenTextPlaceholder`
      : `${contentQuestionsTranslationPrefix}.openTextPlaceholder`,
  );
  protected readonly textControl = computed(() => this.control() as FormControl<string>);
}
