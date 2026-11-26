import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { AuthenticatedMfaEnrollmentModalData } from './authenticated-mfa-enrollment-modal-data.model';
import { AuthenticatedMfaEnrollmentComponent } from './authenticated-mfa-enrollment.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthenticatedMfaEnrollmentComponent, IgntDialogModule, IgntIconButtonComponent, TranslateModule],
  selector: 'app-authenticated-mfa-enrollment-modal',
  styleUrl: './authenticated-mfa-enrollment-modal.component.scss',
  templateUrl: './authenticated-mfa-enrollment-modal.component.html',
})
export class AuthenticatedMfaEnrollmentModalComponent {
  readonly #dialogData = inject<AuthenticatedMfaEnrollmentModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<boolean>>(IGNT_DIALOG_REF);

  protected onCompleted(): void {
    this.#dialogRef.close(true);
  }

  protected onDismiss(): void {
    this.#dialogRef.close(false);
  }

  protected onEnrolled(): void {
    this.#dialogData.onEnrolled();
  }
}
