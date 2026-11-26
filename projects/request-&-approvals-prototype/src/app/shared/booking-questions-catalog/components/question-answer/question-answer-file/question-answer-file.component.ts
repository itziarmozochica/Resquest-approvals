import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { IgntDialogService } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { AnswerFileKind } from '../../../models/answer-file-kind.enum';
import { BookingQuestionAnswerFile } from '../../../models/booking-question-answer.model';
import { getAnswerFileKind } from '../../../utils/answer-file-kind.util';
import { QuestionAnswerFilePreviewComponent } from '../question-answer-file-preview/question-answer-file-preview.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconButtonComponent, NgOptimizedImage, TranslateModule],
  selector: 'app-question-answer-file',
  styleUrl: './question-answer-file.component.scss',
  templateUrl: './question-answer-file.component.html',
})
export class QuestionAnswerFileComponent {
  readonly #dialog = inject(IgntDialogService);

  readonly file = input<BookingQuestionAnswerFile | null>(null);
  readonly title = input<string>('');

  protected readonly kinds = AnswerFileKind;
  protected readonly kind = computed<AnswerFileKind | null>(() => {
    const file = this.file();

    return file ? getAnswerFileKind(file.type) : null;
  });

  protected onPreview(file: BookingQuestionAnswerFile): void {
    this.#dialog.openModal(QuestionAnswerFilePreviewComponent, { data: { file, title: this.title() } });
  }
}
