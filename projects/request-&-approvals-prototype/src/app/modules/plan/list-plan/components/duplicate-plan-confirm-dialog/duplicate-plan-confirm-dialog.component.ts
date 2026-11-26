import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';

import { DuplicatePlanConfirmDialogData } from './duplicate-plan-confirm-dialog.model';

export type { DuplicatePlanConfirmDialogData } from './duplicate-plan-confirm-dialog.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule],
  selector: 'app-duplicate-plan-confirm-dialog',
  standalone: true,
  styleUrl: './duplicate-plan-confirm-dialog.component.scss',
  templateUrl: './duplicate-plan-confirm-dialog.component.html',
})
export class DuplicatePlanConfirmDialogComponent {
  readonly #dialogRef = inject<IgntDialogRef<boolean>>(IGNT_DIALOG_REF);
  protected readonly data = inject<DuplicatePlanConfirmDialogData>(IGNT_DIALOG_DATA);

  accept(): void {
    this.#dialogRef.close(true);
  }

  cancel(): void {
    this.#dialogRef.close(false);
  }
}
