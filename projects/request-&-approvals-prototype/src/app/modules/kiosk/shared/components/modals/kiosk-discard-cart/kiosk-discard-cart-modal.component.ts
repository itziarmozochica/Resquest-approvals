import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { UserService } from '@fz-original/app/shared/services/user/user.service';

import { KioskBaseModal } from '../kiosk-base-modals.class';

@Component({
  selector: 'app-kiosk-discard-cart-modal',
  standalone: false,
  templateUrl: './kiosk-discard-cart-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-discard-cart-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskDiscardCartModalComponent extends KioskBaseModal {
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
