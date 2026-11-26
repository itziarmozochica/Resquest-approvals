import { Dialog } from '@angular/cdk/dialog';
import { CommonModule, CurrencyPipe, formatCurrency, getCurrencySymbol } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, LOCALE_ID } from '@angular/core';

import { depositRefundCompleted } from '@fz-original/app/modules/reservation/tracking/events/deposit-refund-completed.event';
import { depositRefundFailed } from '@fz-original/app/modules/reservation/tracking/events/deposit-refund-failed.event';
import { refundDepositClick } from '@fz-original/app/modules/reservation/tracking/events/refund-deposit-click.event';
import { BusinessPaymentTypeEnum } from '@fz-original/app/modules/settings/shared/models/business-payment-type.enum';
import { MessageDialogComponent, MessageDialogData } from '@fz-original/app/shared/components/message-dialog/message-dialog.component';
import { DepositStatusEnum } from '@fz-original/app/shared/models/deposit/deposit-status.enum';
import { Deposit } from '@fz-original/app/shared/models/deposit/deposit.model';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

import { TranslationKeyExistsPipe } from '../../../../shared/pipes/translation-key-exists/translation-key-exists.pipe';
import { ReservationStatus } from '../../models/reservation-status.enum';
import { DepositRefundedCardComponent } from '../deposit-refunded-card/deposit-refunded-card.component';

interface DepositStatusConfig {
  backgroundClass: string;
  cssClass: string;
  icon: string;
  titleKey: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    DepositRefundedCardComponent,
    IgntButtonComponent,
    IgntIconComponent,
    TranslateModule,
    TranslationKeyExistsPipe,
  ],
  selector: 'app-deposit-status-badge',
  standalone: true,
  styleUrls: ['./deposit-status-badge.component.scss'],
  templateUrl: './deposit-status-badge.component.html',
})
export class DepositStatusBadgeComponent {
  readonly #REFUNDABLE_PAYMENT_GATEWAY = 'stripe';

  #dialog = inject(Dialog);
  readonly #fzTracking = inject(FzTrackingService);
  #locale = inject(LOCALE_ID);
  #translate = inject(TranslateService);
  deposit = input.required<Deposit>();
  currency = input<string | null>(null);
  isInReservationDetails = input(false);
  onRefund = input<() => Observable<boolean>>();
  reservationId = input<string>();
  reservationStatus = input<ReservationStatus>();
  showRefundButton = input(false);
  depositAmount = computed<number | undefined>(() => this.deposit().calculatedAmount?.amount);
  depositCurrency = computed<string | undefined>(() => this.currency() ?? this.deposit().calculatedAmount?.currency);
  depositStatusConfig = computed<DepositStatusConfig | null>(() => {
    switch (this.deposit().status) {
      case 'paid':
        return {
          backgroundClass: 'deposit-background--success',
          cssClass: 'deposit-status--paid',
          icon: 'check',
          titleKey: 'reservation.checkout.reservationSecured',
        };
      case 'skipped':
        return {
          backgroundClass: 'deposit-background--info',
          cssClass: 'deposit-status--skipped',
          icon: 'circle',
          titleKey: 'reservation.checkout.depositSkipped',
        };
      case 'pending':
        if (this.isInReservationDetails()) {
          return {
            backgroundClass: 'deposit-background--warning',
            cssClass: 'deposit-status--pending',
            icon: 'circle',
            titleKey: 'reservation.checkout.depositPending',
          };
        }
        return null;
      case 'cancelled':
        return {
          backgroundClass: 'deposit-background--error',
          cssClass: 'deposit-status--cancelled',
          icon: 'xmark',
          titleKey: 'reservation.checkout.depositCancelled',
        };
      case 'expired':
        return {
          backgroundClass: 'deposit-background--error',
          cssClass: 'deposit-status--expired',
          icon: 'xmark',
          titleKey: 'reservation.checkout.depositExpired',
        };
      default:
        return null;
    }
  });

  isRefunded = computed<boolean>(() => this.deposit().status === DepositStatusEnum.REFUNDED);
  isReservationCancelledOrExpired = computed<boolean>(() => {
    const status = this.reservationStatus();
    return status === ReservationStatus.CANCELLED || status === ReservationStatus.EXPIRED;
  });
  canShowRefundButton = computed<boolean>(() => {
    const deposit = this.deposit();

    const isDepositPaid = deposit.status === DepositStatusEnum.PAID;
    const isRefundableGateway = deposit.paymentGateway?.toLowerCase() === this.#REFUNDABLE_PAYMENT_GATEWAY;
    const isReservationRefundable = this.isReservationCancelledOrExpired();
    const isBackendRefundable = deposit.isRefundable !== false;

    return (
      this.showRefundButton() &&
      this.isInReservationDetails() &&
      isDepositPaid &&
      isRefundableGateway &&
      isReservationRefundable &&
      isBackendRefundable
    );
  });
  shouldShowNonCardRefundMessage = computed<boolean>(() => {
    const deposit = this.deposit();

    const isDepositPaid = deposit.status === DepositStatusEnum.PAID;
    const isRefundableGateway = deposit.paymentGateway?.toLowerCase() === this.#REFUNDABLE_PAYMENT_GATEWAY;
    return isDepositPaid && !isRefundableGateway && this.isInReservationDetails();
  });
  isMarkAsPaidDeposit = computed<boolean>(
    () => this.deposit().isMarkAsPaidPayment === true || this.deposit().paymentGateway?.toLowerCase() === 'delegated',
  );

  getDepositIcon(): string {
    return this.depositStatusConfig()?.icon || 'circle';
  }

  getPaymentDate(): string | null {
    return this.deposit().paidAt || null;
  }

  getPaymentMethodDisplayName(): string {
    const method: BusinessPaymentTypeEnum =
      (this.deposit().paymentMethod?.toLowerCase() as BusinessPaymentTypeEnum) || ('' as BusinessPaymentTypeEnum);

    if (!method) {
      return '';
    }

    const translationKeyMap: Record<BusinessPaymentTypeEnum, string> = {
      balance: 'businessManagement.paymentSettings.balance',
      bank_transfer: 'businessManagement.paymentSettings.bank_transfer',
      bon_admin: 'businessManagement.paymentSettings.bon_admin',
      card: 'businessManagement.paymentSettings.card',
      cash: 'businessManagement.paymentSettings.cash',
      delegated_card: 'businessManagement.paymentSettings.delegated_card',
      fever_receipt_document: 'businessManagement.paymentSettings.fever_receipt_document',
      free: 'businessManagement.paymentSettings.free',
      invoicing: 'businessManagement.paymentSettings.invoicing',
      none: 'businessManagement.paymentSettings.none',
      receipt_document: 'businessManagement.paymentSettings.receipt_document',
      stripe: 'businessManagement.paymentSettings.stripe',
    };

    const translationKey = translationKeyMap[method];
    if (translationKey) {
      const translation = this.#translate.instant(translationKey);
      if (translation !== translationKey) {
        return translation;
      }
    }

    const fallbackKey = `boxOffice.cart.paymentMethods.${method}`;
    const fallbackTranslation = this.#translate.instant(fallbackKey);
    if (fallbackTranslation !== fallbackKey) {
      return fallbackTranslation;
    }

    return '';
  }

  hasPaymentDetails(): boolean {
    const deposit = this.deposit();
    return !!(deposit.paidAt && deposit.paymentMethod);
  }

  openRefundModal(): void {
    const depositAmount = this.deposit().calculatedAmount?.amount ?? 0;
    const currency = this.depositCurrency() ?? 'USD';
    const formattedAmount = formatCurrency(depositAmount, this.#locale, getCurrencySymbol(currency, 'narrow', this.#locale), currency);

    const onRefund = this.onRefund();
    const dialogData: MessageDialogData = {
      acceptButtonLabel: this.#translate.instant('reservation.deposit.refund.modal.confirmButton'),
      acceptButtonVariant: 'danger',
      buttonsLayout: 'vertical',
      cancelButtonLabel: this.#translate.instant('reservation.deposit.refund.modal.cancelButton'),
      onAccept: onRefund
        ? () => {
            this.#trackRefundClickEvent();
            return onRefund().pipe(
              map(success => {
                if (success) {
                  this.#trackRefundCompletedEvent();
                } else {
                  this.#trackRefundFailedEvent();
                }
                return success;
              }),
            );
          }
        : undefined,
      sections: [
        {
          align: 'left',
          items: [
            this.#translate.instant('reservation.deposit.refund.modal.refundTo', { amount: formattedAmount }),
            this.#translate.instant('reservation.deposit.refund.modal.undoWarning'),
          ],
          type: 'list',
        },
      ],
      title: this.#translate.instant('reservation.deposit.refund.modal.title'),
    };

    this.#dialog.open<boolean, MessageDialogData>(MessageDialogComponent, {
      data: dialogData,
      disableClose: true,
    });
  }

  #trackRefundClickEvent(): void {
    const payload = this.#buildRefundTrackingPayload();
    this.#fzTracking.track(refundDepositClick(payload));
  }

  #trackRefundCompletedEvent(): void {
    const payload = this.#buildRefundTrackingPayload();
    this.#fzTracking.track(depositRefundCompleted(payload));
  }

  #trackRefundFailedEvent(errorCode?: string | number | null): void {
    const payload = this.#buildRefundTrackingPayload();
    this.#fzTracking.track(
      depositRefundFailed({
        ...payload,
        errorCode: errorCode ?? null,
      }),
    );
  }

  #buildRefundTrackingPayload(): {
    currency: string;
    depositId: string;
    paymentMethod: string;
    refundedAmount: number;
    reservationId: string;
  } {
    const deposit = this.deposit();
    return {
      currency: this.depositCurrency() ?? '',
      depositId: deposit.id ?? '',
      paymentMethod: deposit.paymentMethod ?? '',
      refundedAmount: deposit.calculatedAmount?.amount ?? 0,
      reservationId: this.reservationId() ?? '',
    };
  }
}
