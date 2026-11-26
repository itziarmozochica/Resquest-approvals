import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';

export interface CancelTransferConfirmModalData {
  acceptLabel: string;
  cancelLabel: string;
  message: string;
  title: string;
}

export interface CancelTransferConfirmModalResult {
  confirmed: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule],
  selector: 'app-cancel-transfer-confirm-modal',
  standalone: true,
  styleUrl: './cancel-transfer-confirm-modal.component.scss',
  templateUrl: './cancel-transfer-confirm-modal.component.html',
})
export class CancelTransferConfirmModalComponent {
  readonly #dialogRef = inject<IgntDialogRef<CancelTransferConfirmModalResult>>(IGNT_DIALOG_REF);

  protected readonly dialogData = inject<CancelTransferConfirmModalData>(IGNT_DIALOG_DATA);
  protected readonly isLoading = signal(false);

  onAccept(): void {
    if (this.isLoading()) {
      return;
    }
    this.#dialogRef.close({ confirmed: true });
  }

  onCancel(): void {
    if (this.isLoading()) {
      return;
    }
    this.#dialogRef.close({ confirmed: false });
  }
}
