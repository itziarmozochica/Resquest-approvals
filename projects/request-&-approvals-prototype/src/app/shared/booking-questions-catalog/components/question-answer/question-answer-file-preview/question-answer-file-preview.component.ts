import { NgOptimizedImage } from '@angular/common';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IGNT_DIALOG_DATA, IgntButtonComponent, IgntDialogModule, IgntToastService } from '@ignite/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { saveAs } from 'file-saver';

import { AnswerFileKind } from '../../../models/answer-file-kind.enum';
import { BookingQuestionAnswerFile } from '../../../models/booking-question-answer.model';
import { getAnswerFileKind } from '../../../utils/answer-file-kind.util';

export interface QuestionAnswerFilePreviewData {
  file: BookingQuestionAnswerFile;
  title: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule, NgOptimizedImage, TranslateModule],
  selector: 'app-question-answer-file-preview',
  styleUrl: './question-answer-file-preview.component.scss',
  templateUrl: './question-answer-file-preview.component.html',
})
export class QuestionAnswerFilePreviewComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #toast = inject(IgntToastService);
  readonly #translate = inject(TranslateService);
  readonly #http = new HttpClient(inject(HttpBackend));

  protected readonly data = inject<QuestionAnswerFilePreviewData>(IGNT_DIALOG_DATA);
  protected readonly kinds = AnswerFileKind;
  protected readonly downloading = signal<boolean>(false);
  protected readonly kind = computed<AnswerFileKind>(() => getAnswerFileKind(this.data.file.type));

  protected onDownload(): void {
    this.downloading.set(true);
    this.#http
      .get(this.data.file.url, { responseType: 'blob' })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#toast.danger(String(this.#translate.instant('questionAnswer.downloadError')));
          this.downloading.set(false);
        },
        next: blob => {
          saveAs(blob, this.#fileName());
          this.downloading.set(false);
        },
      });
  }

  /** A thrown URL here would escape the next handler, leaving no toast and the button spinning for good. */
  #fileName(): string {
    let fromUrl: string | undefined;
    try {
      fromUrl = new URL(this.data.file.url).pathname.split('/').pop();
    } catch {
      fromUrl = undefined;
    }

    return fromUrl && fromUrl.includes('.') ? fromUrl : `${this.data.title}`;
  }
}
