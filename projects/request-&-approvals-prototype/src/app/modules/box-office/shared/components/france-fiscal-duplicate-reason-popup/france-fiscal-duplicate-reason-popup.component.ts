import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  IGNT_DIALOG_REF,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
  IgntDialogRef,
} from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    IgntButtonComponent,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    IgntInputFieldComponent,
  ],
  selector: 'fzo-france-fiscal-duplicate-reason-popup',
  standalone: true,
  styleUrl: './france-fiscal-duplicate-reason-popup.component.scss',
  templateUrl: './france-fiscal-duplicate-reason-popup.component.html',
})
export class FranceFiscalDuplicateReasonPopupComponent {
  readonly #dialogRef = inject<IgntDialogRef<string | undefined>>(IGNT_DIALOG_REF);

  readonly form = new FormGroup({
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
  });

  cancel(): void {
    this.#dialogRef.close(undefined);
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.#dialogRef.close(this.form.controls.reason.value.trim());
  }
}
