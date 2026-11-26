import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';

import { IGNT_DIALOG_DATA, IgntDialogModule } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';

import { PrintProgressDialogData } from '../../services/print-dialog/models/print-dialog.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntDialogModule, IgntIconComponent],
  selector: 'app-print-progress-dialog',
  styleUrl: './print-progress-dialog.component.scss',
  templateUrl: './print-progress-dialog.component.html',
})
export class PrintProgressDialogComponent {
  protected readonly message: Signal<string> = inject<PrintProgressDialogData>(IGNT_DIALOG_DATA).message;
}
