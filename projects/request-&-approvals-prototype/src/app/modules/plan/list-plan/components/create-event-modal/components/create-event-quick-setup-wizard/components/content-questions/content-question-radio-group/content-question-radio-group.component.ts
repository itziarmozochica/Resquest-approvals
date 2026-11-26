import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { TranslateModule } from '@ngx-translate/core';

import { ContentQuestion, contentQuestionOptionKeys } from '../../../../../models/content-questions.model';
import { contentOptionTranslationKey, ContentQuestionControl } from '../content-questions.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntRadioComponent, IgntRadioGroupComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-content-question-radio-group',
  styleUrl: './content-question-radio-group.component.scss',
  templateUrl: './content-question-radio-group.component.html',
})
export class ContentQuestionRadioGroupComponent {
  readonly control = input.required<ContentQuestionControl>();
  readonly fieldId = input.required<string>();
  readonly question = input.required<ContentQuestion>();

  protected readonly optionControl = computed(() => this.control() as FormControl<string>);
  protected readonly optionKeys = computed(() => contentQuestionOptionKeys(this.question()));

  protected optionTranslationKey(optionKey: string): string {
    return contentOptionTranslationKey(optionKey);
  }
}
