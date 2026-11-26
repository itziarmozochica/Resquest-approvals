import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { isPlaceholderEmail } from '../../../../utils/placeholder-email.util';
import { ResendTicketsModalData, ResendTicketsModalResult, ResendType, ResendTypeOption } from './resend-tickets-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntExpansionPanelComponent,
    IgntInputFieldComponent,
    NgSelectModule,
    TranslateModule,
  ],
  selector: 'app-resend-tickets-modal',
  standalone: true,
  styleUrls: ['./resend-tickets-modal.component.scss'],
  templateUrl: './resend-tickets-modal.component.html',
})
export class ResendTicketsModalComponent {
  static readonly EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  #data = inject<ResendTicketsModalData>(DIALOG_DATA);
  #dialogRef = inject(DialogRef<ResendTicketsModalResult>);
  #translate = inject(TranslateService);

  protected canEditEmail: Signal<boolean> = signal<boolean>(this.#data.canEditEmail);
  protected readonly isWalletPassesEnabled: boolean = this.#data.isWalletPassesEnabled;
  protected readonly isWhatsappPurchaseConfirmationEnabled: boolean = this.#data.isWhatsappPurchaseConfirmationEnabled;
  protected readonly hasCustomResendTypes: boolean = this.isWalletPassesEnabled || this.isWhatsappPurchaseConfirmationEnabled;
  protected email: WritableSignal<string> = signal<string>(isPlaceholderEmail(this.#data.orderEmail) ? '' : this.#data.orderEmail);
  protected readonly recipientPhone: string = this.#data.orderPhone;
  protected readonly hasRecipientPhone: boolean = !!this.#data.orderPhone.trim();
  protected includeQrCodes: WritableSignal<boolean> = signal<boolean>(false);
  protected isWhatsappPurchaseConfirmation: Signal<boolean> = computed<boolean>(
    () => this.resendType() === 'whatsapp_purchase_confirmation',
  );
  protected isConfirmDisabled: Signal<boolean> = computed<boolean>(() => {
    if (this.isWhatsappPurchaseConfirmation()) {
      return !this.recipientPhone.trim();
    }
    return !ResendTicketsModalComponent.EMAIL_PATTERN.test(this.email());
  });
  protected resendType: WritableSignal<ResendType> = signal<ResendType>('pdf');
  protected isWalletPasses: Signal<boolean> = computed<boolean>(() => this.resendType() === 'wallet_passes');
  protected resendTypeOptions: ResendTypeOption[] = this.#buildOptions();

  close(): void {
    this.#dialogRef.close();
  }

  confirm(): void {
    const currentEmail = this.email();
    const email = this.isWhatsappPurchaseConfirmation() || currentEmail === this.#data.orderEmail ? undefined : currentEmail;
    this.#dialogRef.close({
      email,
      includeQrCodes: this.includeQrCodes(),
      type: this.resendType(),
    } satisfies ResendTicketsModalResult);
  }

  onResendTypeChange(value: ResendType): void {
    this.resendType.set(value);
  }

  protected get resendTypeModel(): ResendType {
    return this.resendType();
  }

  protected set resendTypeModel(value: ResendType) {
    this.resendType.set(value);
  }

  #buildOptions(): ResendTypeOption[] {
    return [
      { label: this.#translate.instant('validateTicketsNew.resendTicketsModal.typePdf'), value: 'pdf' },
      ...(this.#data.isWalletPassesEnabled
        ? [
            {
              label: this.#translate.instant('validateTicketsNew.resendTicketsModal.typeWalletPasses'),
              value: 'wallet_passes',
            } satisfies ResendTypeOption,
          ]
        : []),
      ...(this.#data.isWhatsappPurchaseConfirmationEnabled
        ? [
            {
              label: this.#translate.instant('validateTicketsNew.resendTicketsModal.typeWhatsappPurchaseConfirmation'),
              value: 'whatsapp_purchase_confirmation',
            } satisfies ResendTypeOption,
          ]
        : []),
    ];
  }
}
