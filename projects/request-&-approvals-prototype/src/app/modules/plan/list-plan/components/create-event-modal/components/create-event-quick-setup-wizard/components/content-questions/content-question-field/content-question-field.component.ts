import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';

import { ContentQuestion } from '../../../../../models/content-questions.model';
import { ContentQuestionMultiSelectComponent } from '../content-question-multi-select/content-question-multi-select.component';
import { ContentQuestionRadioGroupComponent } from '../content-question-radio-group/content-question-radio-group.component';
import { ContentQuestionRangeComponent } from '../content-question-range/content-question-range.component';
import { ContentQuestionRichTextComponent } from '../content-question-rich-text/content-question-rich-text.component';
import { ContentQuestionSingleSelectComponent } from '../content-question-single-select/content-question-single-select.component';
import { ContentQuestionTextareaComponent } from '../content-question-textarea/content-question-textarea.component';
import {
  ContentQuestionControl,
  contentQuestionsTranslationPrefix,
  resolveContentQuestionErrorTranslationKey,
  resolveContentQuestionWidget,
} from '../content-questions.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ContentQuestionMultiSelectComponent,
    ContentQuestionRadioGroupComponent,
    ContentQuestionRangeComponent,
    ContentQuestionRichTextComponent,
    ContentQuestionSingleSelectComponent,
    ContentQuestionTextareaComponent,
    TranslateModule,
  ],
  selector: 'app-content-question-field',
  styleUrl: './content-question-field.component.scss',
  templateUrl: './content-question-field.component.html',
})
export class ContentQuestionFieldComponent {
  readonly control = input.required<ContentQuestionControl>();
  readonly descriptionEditorFeatures = input(RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES);
  readonly descriptionImageUpload = input<((file: File) => Observable<string>) | null>(null);
  readonly question = input.required<ContentQuestion>();
  readonly hasError = input(false);
  readonly isRequired = input(false);

  protected readonly fieldId = computed(() => `content-question-${this.question().key}`);
  protected readonly helpTranslationKey = computed(() => {
    const helpKey = this.question().helpKey;

    return helpKey === undefined ? null : `${contentQuestionsTranslationPrefix}.help.${helpKey}`;
  });
  protected readonly isStructuredOpenText = computed(() => this.question().type === 'structured_open_text');
  protected readonly errorTranslationKey = computed(() => {
    if (!this.hasError()) {
      return null;
    }

    return resolveContentQuestionErrorTranslationKey(this.control().errors);
  });
  protected readonly labelTranslationKey = computed(() => `${contentQuestionsTranslationPrefix}.questions.${this.question().labelKey}`);
  protected readonly widget = computed(() => resolveContentQuestionWidget(this.question().type));
}
