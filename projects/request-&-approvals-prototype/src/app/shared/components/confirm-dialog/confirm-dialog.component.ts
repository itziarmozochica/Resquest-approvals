import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

export interface ConfirmDialogData {
  cancelKey?: string;
  confirmKey?: string;
  /**
   * Centres the message under the (already centred) dialog title. Opt-in: the callers that pass a
   * paragraph of explanation read better left-aligned, so only short one-liners should ask for it.
   */
  isCentered?: boolean;
  /** Styles the confirm button as destructive (red) for irreversible actions. */
  isDestructive?: boolean;
  messageKey: string;
  titleKey: string;
  /** Interpolation params for the title translation (e.g. `{ count }`). */
  titleParams?: Record<string, unknown>;
}

export interface ConfirmDialogResult {
  confirmed: boolean;
}

/** Generic yes/no confirmation modal. Caller passes translation keys; the result is `{ confirmed }`. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule, TranslateModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly #dialogRef = inject<IgntDialogRef<ConfirmDialogResult>>(IGNT_DIALOG_REF);

  protected readonly data = inject<ConfirmDialogData>(IGNT_DIALOG_DATA);
  protected readonly confirmKey = this.data.confirmKey ?? 'common.confirm';
  protected readonly cancelKey = this.data.cancelKey ?? 'common.cancel';

  onConfirm(): void {
    this.#dialogRef.close({ confirmed: true });
  }

  onCancel(): void {
    this.#dialogRef.close({ confirmed: false });
  }
}
