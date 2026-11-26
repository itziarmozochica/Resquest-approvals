import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BaseResponse } from '../../../../../../shared/models/base-response';
import { KioskConfirmationEmailService } from '../../../../services/email/kiosk-purchase-confirmation-email.service';
import { KioskEmailModalData } from './kiosk-email-modal.model';

@Component({
  selector: 'app-kiosk-email-modal',
  standalone: false,
  templateUrl: './kiosk-email-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-email-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskEmailModalComponent {
  emailInvalid = false;
  isSending = signal(false);
  sendFailed = signal(false);

  data: KioskEmailModalData = inject(DIALOG_DATA);
  readonly #destroyRef = inject(DestroyRef);
  #dialogRef = inject(DialogRef);
  #kioskConfirmationEmailService = inject(KioskConfirmationEmailService);

  sendEmail(email: string): void {
    if (this.isSending()) {
      return;
    }
    this.sendFailed.set(false);
    if (!this.#isValidEmail(email)) {
      this.emailInvalid = true;
      return;
    }
    this.emailInvalid = false;
    this.#setSending(true);

    this.#kioskConfirmationEmailService
      .sendAlternativeConfirmationEmail({
        email: email,
        partnerId: this.data.partnerId,
        planId: this.data.planId,
        placeId: this.data.placeId,
        orderId: this.data.orderId,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response: BaseResponse<null>) => {
          if (response.error) {
            this.#onSendFailed();
            return;
          }
          this.#dialogRef.close(true);
        },
        error: () => this.#onSendFailed(),
      });
  }

  close(): void {
    this.#dialogRef.close(false);
  }

  #isValidEmail(email: string): boolean {
    const local = "(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*)";
    const domain = '(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])+)';
    const email_regexp = new RegExp(`^${local}@${domain}$`, 'i');

    return email_regexp.test(email);
  }

  #onSendFailed(): void {
    this.#setSending(false);
    this.sendFailed.set(true);
  }

  #setSending(isSending: boolean): void {
    this.isSending.set(isSending);
    this.#dialogRef.disableClose = isSending;
  }
}
