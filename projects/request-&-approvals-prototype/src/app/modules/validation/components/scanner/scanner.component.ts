import { Component, inject } from '@angular/core';

import { IGNT_DIALOG_REF, type IgntDialogRef } from '@ignite/common';

@Component({
  selector: 'app-scanner',
  standalone: false,
  styleUrls: ['./scanner.component.scss'],
  templateUrl: './scanner.component.html',
})
export class ScannerComponent {
  readonly #dialogRef = inject<IgntDialogRef<string> | null>(IGNT_DIALOG_REF, { optional: true });

  protected onScanResult(resultString: string): void {
    this.#dialogRef?.close(resultString);
  }
}
