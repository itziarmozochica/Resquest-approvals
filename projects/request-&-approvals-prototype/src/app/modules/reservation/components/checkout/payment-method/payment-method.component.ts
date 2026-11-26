import { NgForOf, NgIf, NgSwitch, NgSwitchCase, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, effect, EventEmitter, inject, Input, OnChanges, OnInit, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { BalanceQuery } from '@fz-original/app/modules/settings/shared/services/balance-query';
import { IgntIconComponent, IgntIconName } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { CardElement } from '@feverup/ts-stripe-sdk';

import { CardStripeInputComponent } from '../../../../../shared/components/card-stripe-input/card-stripe-input.component';
import { SharedComponentsModule } from '../../../../../shared/components/shared-components.module';
import { Cart } from '../../../../../shared/models/cart/cart.model';
import { Partner } from '../../../../../shared/models/partner/partner.model';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { UserService } from '../../../../../shared/services/user/user.service';
import { Balance } from '../../../../settings/shared/models/balance.model';
import { BusinessPaymentTypeEnum } from '../../../../settings/shared/models/business-payment-type.enum';
import { BalanceService } from '../../../../settings/shared/services/balance.service';
import { ReservationsService } from '../../../services/reservations.service';
import { ActiveInvoicingPeriodBannerComponent } from './active-invoicing-period-banner/active-invoicing-period-banner.component';
import { BalanceBannerComponent } from './balance-banner/balance-banner.component';
import { ReceiptDocumentBannerComponent } from './receipt-document-banner/receipt-document-banner.component';

export interface BusinessPaymentMethodOption {
  disabled?: boolean;
  iconName?: IgntIconName;
  imageUrl?: string;
  label: string;
  method: BusinessPaymentTypeEnum;
  requiresMoneyConfirmation?: boolean;
  showReceiptDocumentBanner?: boolean;
}

@Component({
  selector: 'reservation-payment-method',
  templateUrl: './payment-method.component.html',
  styleUrls: ['./payment-method.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    IgntIconComponent,
    TranslateModule,
    NgSwitchCase,
    NgSwitch,
    NgIf,
    CardStripeInputComponent,
    ActiveInvoicingPeriodBannerComponent,
    BalanceBannerComponent,
    ReceiptDocumentBannerComponent,
    NgForOf,
    SharedComponentsModule,
  ],
})
export class PaymentMethodComponent implements OnInit, OnChanges {
  #businessId: string | null = null;
  #destroyRef = inject(DestroyRef);
  #reservationsService = inject(ReservationsService);
  #route = inject(ActivatedRoute);
  balance: Balance | null = null;
  @Output() balanceCheck: EventEmitter<boolean> = new EventEmitter();
  protected readonly BusinessPaymentTypeEnum = BusinessPaymentTypeEnum;
  @Output() cardAdded: EventEmitter<CardElement | null> = new EventEmitter();
  @Input() cart: Cart | null = null;
  isLoading = true;
  locale: string | null = null;
  @Output() moneyConfirmationChange: EventEmitter<boolean> = new EventEmitter();
  partner: Partner | null = null;
  @Input() paymentMethods: BusinessPaymentMethodOption[] = [];
  paymentType: BusinessPaymentTypeEnum | null = null;
  @Output() paymentTypeChange: EventEmitter<BusinessPaymentTypeEnum> = new EventEmitter();
  @Output() receiptDocumentChange: EventEmitter<string> = new EventEmitter();
  reservationId: string = this.#route.snapshot.params.reservationId;
  showReceiptDocumentBanner = false;
  bannerRequiresMoneyConfirmation = false;

  constructor(
    private balanceService: BalanceService,
    private partnerService: PartnerService,
    private userService: UserService,
  ) {
    effect(() => {
      if (this.paymentMethods?.length > 0) {
        this.isLoading = false;
        if (!this.paymentType) {
          this.selectPaymentMethod(this.paymentMethods[0].method);
        }
      } else {
        this.isLoading = true;
      }
    });
  }

  checkEnoughBalance(): void {
    this.balanceCheck.emit(
      this.balance?.amount != null &&
        this.cart?.total?.amount != null &&
        this.balance.amount >= this.cart.total.amount &&
        this.balance?.currency === this.cart?.total?.currency,
    );
  }

  getBalance(): void {
    const user = this.userService.getUser();
    const userId = this.userService.isBusiness() && user ? user.id : null;
    const balanceQuery: BalanceQuery = { partnerId: this.partner?.id ?? 0, businessId: this.#businessId ?? '', userId };
    if (!this.balance) {
      this.balanceService.getBalance(balanceQuery).subscribe(response => {
        if (response && response.data) {
          this.balance = response.data;
          this.checkEnoughBalance();
        }
      });
    }
  }

  ngOnChanges(): void {
    if (this.paymentMethods?.length > 0) {
      this.isLoading = false;
      if (!this.paymentType) {
        this.selectPaymentMethod(this.paymentMethods[0].method);
      }
    } else {
      this.isLoading = true;
    }
  }

  ngOnInit(): void {
    const user = this.userService.getUser();
    const userId = this.userService.isBusiness() && user ? user.id : null;
    this.partner = this.partnerService.getPartner();
    if (this.userService.isBusiness() && user?.business?.id) {
      this.#businessId = user.business.id;
    } else {
      this.#reservationsService
        .getReservation({ partnerId: this.partner?.id ?? 0, reservationId: this.reservationId, userId })
        .pipe(
          takeUntilDestroyed(this.#destroyRef),
          catchError((error: unknown) => {
            console.error('Error fetching reservation:', error);
            return of(null);
          }),
        )
        .subscribe(response => {
          if (response) {
            this.#businessId = response.data?.reservationData?.businessId ?? null;
          }
        });
    }
  }

  onMoneyConfirmationChange(confirmed: boolean): void {
    this.moneyConfirmationChange.emit(confirmed);
  }

  onReceiptDocumentChange(document: string): void {
    this.receiptDocumentChange.emit(document);
  }

  selectPaymentMethod(paymentType: BusinessPaymentTypeEnum): void {
    this.paymentType = paymentType;

    // Reset flags
    this.showReceiptDocumentBanner = false;
    this.bannerRequiresMoneyConfirmation = false;

    if (paymentType === BusinessPaymentTypeEnum.BALANCE) {
      this.getBalance();
    }

    const selectedMethod = this.paymentMethods.find(m => m.method === paymentType);

    if (
      paymentType === BusinessPaymentTypeEnum.DELEGATED_CARD ||
      paymentType === BusinessPaymentTypeEnum.CASH ||
      paymentType === BusinessPaymentTypeEnum.BANK_TRANSFER ||
      paymentType === BusinessPaymentTypeEnum.RECEIPT_DOCUMENT ||
      paymentType === BusinessPaymentTypeEnum.FEVER_RECEIPT_DOCUMENT ||
      selectedMethod?.showReceiptDocumentBanner
    ) {
      this.showReceiptDocumentBanner = true;
    }

    this.bannerRequiresMoneyConfirmation = selectedMethod?.requiresMoneyConfirmation ?? false;

    this.paymentTypeChange.emit(paymentType);
  }

  stripeCardAdded(card: CardElement | null): void {
    this.cardAdded.emit(card);
  }
}
