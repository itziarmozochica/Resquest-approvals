import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { UserService } from '@fz-original/app/shared/services/user/user.service';

import { KioskBaseModal } from '../kiosk-base-modals.class';

@Component({
  selector: 'app-kiosk-cancel-modal',
  standalone: false,
  templateUrl: './kiosk-cancel-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-cancel-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskCancelModalComponent extends KioskBaseModal {
  #dialogRef = inject(DialogRef);

  constructor() {
    super(inject(UserService));
  }

  close(): void {
    this.#dialogRef.close(false);
  }

  confirm(): void {
    this.#dialogRef.close(true);
  }
}
