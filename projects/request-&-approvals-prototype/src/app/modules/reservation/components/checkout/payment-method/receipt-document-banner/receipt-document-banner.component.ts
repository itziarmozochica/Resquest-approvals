import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, input, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BusinessPaymentTypeEnum } from '@fz-original/app/modules/settings/shared/models/business-payment-type.enum';
import { IgntAlertComponent } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-receipt-document-banner',
  templateUrl: './receipt-document-banner.component.html',
  styleUrls: ['./receipt-document-banner.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, TranslateModule, IgntCheckboxComponent, NgIf, IgntAlertComponent],
})
export class ReceiptDocumentBannerComponent {
  @Input() helperText = 'boxOffice.receiptDocument.helper';
  @Output() moneyConfirmationChange: EventEmitter<boolean> = new EventEmitter();
  moneyConfirmed = false;
  paymentNote = '';
  @Input() paymentType: BusinessPaymentTypeEnum | null = null;
  @Output() receiptDocumentChange: EventEmitter<string> = new EventEmitter();
  requiresMoneyConfirmation = input<boolean>(false);
  @Input() titleText = 'boxOffice.receiptDocument.title';

  protected readonly BusinessPaymentTypeEnum = BusinessPaymentTypeEnum;

  onMoneyConfirmationChange(confirmed: boolean): void {
    this.moneyConfirmed = confirmed;
    this.moneyConfirmationChange.emit(confirmed);
  }

  onPaymentNoteChange(note: string): void {
    this.receiptDocumentChange.emit(note);
  }

  shouldShowCheckbox(): boolean {
    return (
      this.requiresMoneyConfirmation() ||
      this.paymentType === BusinessPaymentTypeEnum.BANK_TRANSFER ||
      this.paymentType === BusinessPaymentTypeEnum.RECEIPT_DOCUMENT ||
      this.paymentType === BusinessPaymentTypeEnum.FEVER_RECEIPT_DOCUMENT
    );
  }

  shouldShowDisclaimer(): boolean {
    return this.paymentType === BusinessPaymentTypeEnum.BANK_TRANSFER;
  }
}
