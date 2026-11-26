import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import {
  IGNT_DIALOG_REF,
  IgntButtonComponent,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
  IgntDialogRef,
} from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntButtonComponent, IgntDialogHeaderComponent, IgntDialogContentComponent, IgntDialogFooterComponent],
  selector: 'app-remove-confirmation-member-account-modal',
  standalone: true,
  templateUrl: './remove-confirmation-member-account-modal.component.html',
})
export class RemoveConfirmationMemberAccountModalComponent {
  readonly #dialogRef = inject<IgntDialogRef<boolean>>(IGNT_DIALOG_REF);

  protected closeModal(): void {
    this.#dialogRef.close(false);
  }

  protected removeMemberAccount(): void {
    this.#dialogRef.close(true);
  }
}
