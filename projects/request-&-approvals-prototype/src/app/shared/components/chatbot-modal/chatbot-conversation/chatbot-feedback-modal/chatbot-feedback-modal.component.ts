import { ChangeDetectionStrategy, Component, computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { FEEDBACK_OPTIONS, FeedbackOption } from './chatbot-feedback-modal.config';
import { FeedbackModalResult } from './chatbot-feedback-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IgntButtonComponent, IgntDialogModule, TranslateModule],
  selector: 'app-chatbot-feedback-modal',
  standalone: true,
  styleUrls: ['./chatbot-feedback-modal.component.scss'],
  templateUrl: './chatbot-feedback-modal.component.html',
})
export class ChatbotFeedbackModalComponent {
  readonly #dialogRef = inject<IgntDialogRef<FeedbackModalResult>>(IGNT_DIALOG_REF);
  readonly #translateService = inject(TranslateService);

  details: WritableSignal<string | null> = signal<string | null>(null);
  feedbackOptions: FeedbackOption[] = FEEDBACK_OPTIONS;
  selectedReason: WritableSignal<string | null> = signal<string | null>(null);

  isSubmitDisabled: Signal<boolean> = computed<boolean>(() => {
    const reason = this.selectedReason();
    if (!reason) return true;

    if (reason === 'other') {
      const detailsValue = this.details();
      return !detailsValue || detailsValue.trim().length === 0;
    }

    return false;
  });

  cancel(): void {
    this.#dialogRef.close();
  }

  selectReason(reason: string): void {
    this.selectedReason.set(reason);
  }

  submit(): void {
    if (this.isSubmitDisabled()) return;

    const selectedOption = this.feedbackOptions.find((option: FeedbackOption) => option.value === this.selectedReason());
    const translatedReason = selectedOption ? this.#translateService.instant(selectedOption.translationKey) : this.selectedReason()!;

    const message = this.selectedReason() === 'other' ? this.details()?.trim() : translatedReason;
    const type = selectedOption?.type ?? 'unknown';

    this.#dialogRef.close({ message, type });
  }
}
