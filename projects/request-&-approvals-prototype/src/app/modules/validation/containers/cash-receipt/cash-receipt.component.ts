import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SanitizeService } from '@fz-original/app/app/services/sanitize/sanitize.service';
import { Currency } from '@fz-original/app/modules/settings/shared/models/currency-enum';
import { AutoformatNumericInputModule } from '@fz-original/app/shared/directives/autoformat-numeric-input/autoformat-numeric-input.module';
import {
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_REF,
  IgntAlertComponent,
  IgntDialogModule,
  IgntDialogService,
  type IgntDialogRef,
} from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  ValidationCashReceiptComponentAlertData,
  ValidationCashReceiptComponentDialogData,
  ValidationCashReceiptServiceCreateBody,
} from '../../models/validation-cash-receipt.model';
import { CashReceiptService } from '../../services/cash-receipt/cash-receipt.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AutoformatNumericInputModule, IgntAlertComponent, IgntButtonComponent, IgntDialogModule, NgIf, TranslateModule],
  selector: 'app-cash-receipt',
  standalone: true,
  styleUrls: ['./cash-receipt.component.scss'],
  templateUrl: './cash-receipt.component.html',
})
export class CashReceiptComponent {
  static readonly businessNumberPattern = /^\d{10}$/;
  readonly #cashReceiptService = inject(CashReceiptService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogData = inject<ValidationCashReceiptComponentDialogData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<void>>(IGNT_DIALOG_REF);
  readonly #dialogService = inject(IgntDialogService);
  readonly #sanitizeService = inject(SanitizeService);
  readonly #translateService = inject(TranslateService);
  alertData: WritableSignal<ValidationCashReceiptComponentAlertData | null> = signal(null);
  cashReceiptServiceCreateBody: ValidationCashReceiptServiceCreateBody = {
    businessNumber: '',
    totalAmount: 0,
  };
  readonly currency = Currency;
  isInputEnabled: WritableSignal<boolean> = signal(true);
  isIssueButtonEnabled: WritableSignal<boolean> = signal(false);
  isLoading: WritableSignal<boolean> = signal(false);

  changeBusinessNumber(event: Event): void {
    const value: string = (event.target as HTMLInputElement).value;
    this.cashReceiptServiceCreateBody = {
      ...this.cashReceiptServiceCreateBody,
      businessNumber: value,
    };
    this.#checkIssueButtonEnabled();
  }

  changeEmail(event: Event): void {
    const value: string = (event.target as HTMLInputElement).value;
    this.cashReceiptServiceCreateBody = {
      ...this.cashReceiptServiceCreateBody,
      email: value === '' ? undefined : value,
    };
    this.#checkIssueButtonEnabled();
  }

  changeTotalAmount(value: number): void {
    this.cashReceiptServiceCreateBody = {
      ...this.cashReceiptServiceCreateBody,
      totalAmount: value,
    };
    this.#checkIssueButtonEnabled();
  }

  clickIssue(): void {
    this.alertData.set(null);
    this.#setLoading(true);
    this.#cashReceiptService
      .createCashReceipt(this.#dialogData.orderId, this.cashReceiptServiceCreateBody, this.#dialogData.orderPartnerId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => this.#handleCreateCashReceiptSuccess(),
        error: () => this.#handleCreateCashReceiptError(),
      });
  }

  closeAlert(): void {
    this.alertData.set(null);
  }

  pressBusinessNumberKey(event: KeyboardEvent): void {
    if (!/[0-9]/.test(event.key)) {
      event.preventDefault();
    }
  }

  #checkIssueButtonEnabled(): void {
    this.isIssueButtonEnabled.set(
      CashReceiptComponent.businessNumberPattern.test(this.cashReceiptServiceCreateBody.businessNumber) &&
        this.cashReceiptServiceCreateBody.totalAmount > 0,
    );
  }

  #handleCreateCashReceiptError(): void {
    this.#setLoading(false);
    this.alertData.set({
      description: this.#sanitizeService.sanitizeToSafeHtml(this.#translateService.instant('cashReceipt.errorAlertDescription')) ?? '',
      sentiment: 'danger',
    });
  }

  #handleCreateCashReceiptSuccess(): void {
    this.isLoading.set(false);
    this.#dialogService
      .openMessageModal(
        this.#translateService.instant('cashReceipt.title'),
        this.#translateService.instant('cashReceipt.successAlertDescription'),
      )
      .closed$.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#dialogRef.close());
  }

  #setLoading(value: boolean): void {
    this.isLoading.set(value);
    this.isInputEnabled.set(!value);
    this.isIssueButtonEnabled.set(!value);
  }
}
