import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { UserService } from '@fz-original/app/shared/services/user/user.service';

import { KioskBaseModal } from '../kiosk-base-modals.class';

@Component({
  selector: 'app-kiosk-cancel-payment-modal',
  standalone: false,
  templateUrl: './kiosk-cancel-payment-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-cancel-payment-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskCancelPaymentModalComponent extends KioskBaseModal {
  #dialog: DialogRef<boolean> = inject(DialogRef);

  constructor() {
    super(inject(UserService));
  }

  close(): void {
    this.#dialog.close(false);
  }

  confirm(): void {
    this.#dialog.close(true);
  }
}
