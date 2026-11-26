import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { KioskSuccessModalData } from '@fz-original/app/modules/kiosk/shared/components/modals/kiosk-success/kiosk-success-modal.model';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-kiosk-success-modal',
  standalone: false,
  templateUrl: './kiosk-success-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-success-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskSuccessModalComponent {
  #dialogRef = inject(DialogRef);
  #translateService = inject(TranslateService);
  data: KioskSuccessModalData = inject(DIALOG_DATA);

  constructor() {
    if (this.data.buttonLabel === undefined) {
      this.data.buttonLabel = this.#translateService.instant('common.ok');
    }
  }

  close(): void {
    this.#dialogRef.close(false);
  }

  confirm(): void {
    this.#dialogRef.close(true);
  }
}
