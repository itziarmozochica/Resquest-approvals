import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { IgntRichTextEditorComponent } from '@ignite/rich-text-editor';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';

import { ContentQuestionControl } from '../content-questions.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntRichTextEditorComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-content-question-rich-text',
  styleUrl: './content-question-rich-text.component.scss',
  templateUrl: './content-question-rich-text.component.html',
})
export class ContentQuestionRichTextComponent {
  readonly control = input.required<ContentQuestionControl>();
  readonly fieldId = input.required<string>();
  readonly features = input(RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES);
  readonly imageUpload = input<((file: File) => Observable<string>) | null>(null);

  protected readonly placeholderTranslationKey = 'createEvent.quickSetupWizard.step1.descriptionPlaceholder';
  protected readonly textControl = computed(() => this.control() as FormControl<string>);
}
