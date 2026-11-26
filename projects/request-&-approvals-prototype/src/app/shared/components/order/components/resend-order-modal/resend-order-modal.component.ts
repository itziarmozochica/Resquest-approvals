import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';

import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { isPlaceholderEmail } from '../../../../utils/placeholder-email.util';
import { emailValidator } from '../../../../validators/email.validator';
import { ResendOrderModalData, ResendOrderModalResult } from './resend-order-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IgntAlertComponent, IgntButtonComponent, TranslateModule],
  selector: 'app-resend-order-modal',
  standalone: true,
  styleUrls: ['./resend-order-modal.component.scss'],
  templateUrl: './resend-order-modal.component.html',
})
export class ResendOrderModalComponent {
  #data = inject<ResendOrderModalData>(DIALOG_DATA);
  #dialogRef = inject(DialogRef<ResendOrderModalResult>);
  #emailValidatorFn = emailValidator();

  canEditEmail: Signal<boolean> = signal<boolean>(this.#data.canEditEmail);
  email: WritableSignal<string> = signal<string>(isPlaceholderEmail(this.#data.orderEmail) ? '' : this.#data.orderEmail);
  isConfirmDisabled: Signal<boolean> = computed<boolean>(() => {
    return this.email().trim() === '' || this.#emailValidatorFn(new FormControl(this.email())) !== null;
  });
  hasTransferredTickets: Signal<boolean> = computed<boolean>(() =>
    (this.#data.ticketSessions ?? []).some(session => session.getTransfer()),
  );

  close(): void {
    this.#dialogRef.close();
  }

  confirm(): void {
    this.#dialogRef.close({
      recipientEmail: this.email(),
    } satisfies ResendOrderModalResult);
  }
}
