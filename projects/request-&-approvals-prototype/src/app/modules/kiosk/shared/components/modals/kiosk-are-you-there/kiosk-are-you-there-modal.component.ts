import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IdleService } from '@fz-original/app/modules/kiosk/services/idle/idle.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

import { KioskBaseModal } from '../kiosk-base-modals.class';

@Component({
  selector: 'app-kiosk-are-you-there-modal',
  standalone: false,
  templateUrl: './kiosk-are-you-there-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-are-you-there-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskAreYouThereModalComponent extends KioskBaseModal {
  #dialogRef: DialogRef = inject(DialogRef);
  #idleService = inject(IdleService);
  #translateService = inject(TranslateService);
  acceptButtonLabel$: Observable<string> = this.#idleService
    .getRemainingTime()
    .pipe(map((remainingTime: number) => this.#translateService.instant('kiosk.modal.idle.countdown', { countdown: remainingTime })));

  constructor() {
    super(inject(UserService));
  }

  close(response: boolean): void {
    this.#dialogRef.close(response);
  }
}
