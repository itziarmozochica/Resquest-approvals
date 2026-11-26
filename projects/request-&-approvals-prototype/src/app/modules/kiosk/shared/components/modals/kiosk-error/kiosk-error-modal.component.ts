import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { KioskErrorModalData } from './kiosk-error-modal.model';

@Component({
  selector: 'app-kiosk-error-modal',
  standalone: false,
  templateUrl: './kiosk-error-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-error-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskErrorModalComponent {
  #dialogRef = inject(DialogRef);
  #translateService = inject(TranslateService);
  data: KioskErrorModalData = inject(DIALOG_DATA);

  constructor() {
    if (this.data.buttonLabel === undefined) {
      this.data.buttonLabel = this.#translateService.instant('common.accept');
    }
  }

  close(): void {
    this.#dialogRef.close(false);
  }

  confirm(): void {
    this.#dialogRef.close(true);
  }
}
