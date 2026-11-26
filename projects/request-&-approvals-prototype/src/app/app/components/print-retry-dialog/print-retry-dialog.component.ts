import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IgntButtonComponent, IgntDialogCloseDirective, IgntDialogModule } from '@ignite/common';

import { PrintRetryDialogData } from '../../services/print-dialog/models/print-dialog.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogCloseDirective, IgntDialogModule],
  selector: 'app-print-retry-dialog',
  styleUrl: './print-retry-dialog.component.scss',
  templateUrl: './print-retry-dialog.component.html',
})
export class PrintRetryDialogComponent {
  protected readonly data: PrintRetryDialogData = inject<PrintRetryDialogData>(IGNT_DIALOG_DATA);
}
