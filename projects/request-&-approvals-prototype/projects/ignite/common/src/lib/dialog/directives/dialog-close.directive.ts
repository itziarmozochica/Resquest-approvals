import { Directive, inject, input } from '@angular/core';

import { IGNT_DIALOG_REF } from '../models/dialog-ref';

@Directive({
  host: {
    '(click)': 'close()',
  },
  selector: '[igntDialogClose]',
  standalone: true,
})
export class IgntDialogCloseDirective {
  readonly #dialogRef = inject(IGNT_DIALOG_REF);

  readonly igntDialogClose = input<unknown>();

  close(): void {
    const result = this.igntDialogClose();
    // Bare `igntDialogClose` attribute binds as empty string; treat that as dismiss (undefined).
    this.#dialogRef.close(result === '' ? undefined : result);
  }
}
