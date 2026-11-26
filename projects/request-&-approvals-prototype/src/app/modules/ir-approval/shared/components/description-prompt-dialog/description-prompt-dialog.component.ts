import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { DescriptionPromptDialogData, DescriptionPromptDialogResult } from '../../models/description-prompt-dialog.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule, IgntDialogModule, IgntButtonComponent, IgntTextareaFieldComponent],
  selector: 'app-description-prompt-dialog',
  standalone: true,
  styleUrl: './description-prompt-dialog.component.scss',
  templateUrl: './description-prompt-dialog.component.html',
})
export class DescriptionPromptDialogComponent {
  readonly #data = inject<DescriptionPromptDialogData | null>(IGNT_DIALOG_DATA, { optional: true });
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<DescriptionPromptDialogResult>;

  readonly control = new FormControl<string>(this.#data?.value ?? '', { nonNullable: true });
  readonly hintKey = this.#data?.hintKey ?? 'descriptionPrompt.hint';

  confirm(): void {
    this.#dialogRef.close(this.control.value.trim());
  }

  cancel(): void {
    this.#dialogRef.close();
  }
}
