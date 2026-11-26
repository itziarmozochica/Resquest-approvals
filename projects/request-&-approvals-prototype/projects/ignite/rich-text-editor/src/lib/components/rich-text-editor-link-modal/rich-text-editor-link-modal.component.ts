import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators, type AbstractControl } from '@angular/forms';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import type { IngtFormError } from '@ignite/legacy/models/ignt-input.model';

import type { IgntRichTextEditorLinkModalData } from '../../models/rich-text-editor-link-modal-data.model';
import type { IgntRichTextEditorLinkModalResult } from '../../models/rich-text-editor-link-modal-result.model';
import { igntRichTextEditorUrlValidator } from '../../utils/rich-text-editor-url.validator';
import { isValidLinkUrl } from '../../utils/validate-link-url.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule, IgntInputFieldComponent, ReactiveFormsModule],
  selector: 'ignt-rich-text-editor-link-modal',
  standalone: true,
  styleUrl: './rich-text-editor-link-modal.component.scss',
  templateUrl: './rich-text-editor-link-modal.component.html',
})
export class IgntRichTextEditorLinkModalComponent {
  static readonly urlInputId = 'link-modal-url-input';

  readonly #data = inject<IgntRichTextEditorLinkModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<IgntRichTextEditorLinkModalResult>>(IGNT_DIALOG_REF);

  protected readonly translations = this.#data.translations;
  protected readonly hasExistingLink = this.#data.previousUrl !== '';
  protected readonly urlControl = new FormControl(this.#data.previousUrl, {
    nonNullable: true,
    validators: [Validators.required.bind(Validators), (control: AbstractControl) => igntRichTextEditorUrlValidator(control)],
  });
  protected readonly urlInputId = IgntRichTextEditorLinkModalComponent.urlInputId;
  protected readonly customFormErrors: IngtFormError[] = [{ message: this.translations.invalidUrlError, type: 'invalidUrl' }];
  protected readonly urlValue: Signal<string> = toSignal(this.urlControl.valueChanges, { initialValue: this.urlControl.value });
  protected readonly showOpenLink = computed<boolean>(() => this.hasExistingLink && isValidLinkUrl(this.urlValue()));

  protected apply(): void {
    if (this.urlControl.invalid) {
      this.urlControl.markAsTouched();

      return;
    }

    this.#dialogRef.close({ action: 'apply', url: this.urlControl.value.trim() });
  }

  protected cancel(): void {
    this.#dialogRef.close({ action: 'cancel' });
  }

  protected remove(): void {
    this.#dialogRef.close({ action: 'remove' });
  }
}
