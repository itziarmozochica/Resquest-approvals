import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';

import {
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_REF,
  IgntButtonComponent,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
  IgntDialogRef,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

export interface MembershipsAcceptTermsModalData {
  email?: string;
  fullName: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    ReactiveFormsModule,
    IgntButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntDialogHeaderComponent,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
  ],
  selector: 'app-memberships-accept-terms-modal',
  styleUrl: './accept-terms-modal.component.scss',
  templateUrl: './accept-terms-modal.component.html',
})
export class MembershipsAcceptTermsModalComponent {
  readonly #data = inject<MembershipsAcceptTermsModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<boolean>>(IGNT_DIALOG_REF);
  readonly #formBuilder = inject(UntypedFormBuilder);

  protected readonly email = this.#data.email;

  protected formGroup: UntypedFormGroup = this.#formBuilder.group({
    fullName: [{ value: this.#data.fullName, disabled: true }],
    email: [{ value: this.#data.email, disabled: true }],
  });

  protected acceptTerms(): void {
    this.#dialogRef.close(true);
  }
}
