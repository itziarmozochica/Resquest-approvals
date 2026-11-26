import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { QuickSetupPreviewData } from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-preview.model';
import { IgntIconComponent } from '@ignite/icon';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IgntIconComponent, IgntTextareaFieldComponent, NgTemplateOutlet, TranslateModule],
  selector: 'app-quick-setup-preview-step',
  styleUrl: './quick-setup-preview-step.component.scss',
  templateUrl: './quick-setup-preview-step.component.html',
})
export class QuickSetupPreviewStepComponent {
  static readonly feedbackMaxLength = 500;

  readonly previewData = input.required<QuickSetupPreviewData>();

  protected readonly feedback = signal('');
  protected readonly feedbackFieldId = 'create-event-quick-setup-review-feedback';
  protected readonly feedbackMaxLength = QuickSetupPreviewStepComponent.feedbackMaxLength;

  getFeedback(): string {
    return this.feedback();
  }

  /** The field's `maxlength` stops a browser at the cap; the slice keeps the model at it whatever wrote the value. */
  protected onFeedbackChange(value: string): void {
    this.feedback.set(value.slice(0, QuickSetupPreviewStepComponent.feedbackMaxLength));
  }
}
