import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { BusinessPaymentTypeEnum } from '@fz-original/app/modules/settings/shared/models/business-payment-type.enum';
import { BusinessPaymentSettingsService } from '@fz-original/app/modules/settings/shared/services/business-payment-settings.service';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { PartnerCustomPaymentMethod } from '@fz-original/app/shared/models/partner/partner-config.model';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { User } from '@fz-original/app/shared/models/user/user.model';
import { PartnerConfigService } from '@fz-original/app/shared/services/partner-config/partner-config.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntIconName } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { CardElement } from '@feverup/ts-stripe-sdk';

import { PaymentMethod } from '../../../models/payment-methods.enum';
import { ReservationCheckoutFlowTypeEnum } from '../../../models/reservation-checkout-flow-type.enum';
import { Reservation } from '../../../models/reservation.model';
import { ReservationCheckoutPaymentMethodsService } from '../../../services/reservation-checkout-payment-methods.service';
import { ReservationCheckoutStateService } from '../../../services/reservation-checkout-state/reservation-checkout-state.service';
import { clickPayReservation, resolveClickPayReservationPaymentOption } from '../../../tracking/events/click-pay-reservation.event';
import { BusinessPaymentMethodOption, PaymentMethodComponent } from '../../checkout/payment-method/payment-method.component';

@Component({
  selector: 'app-payment-method-mark-as-paid',
  templateUrl: './payment-method-mark-as-paid.component.html',
  styleUrls: ['./payment-method-mark-as-paid.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, TranslateModule, PaymentMethodComponent],
})
export class PaymentMethodMarkAsPaidComponent implements OnInit {
  #businessPaymentSettingsService = inject(BusinessPaymentSettingsService);
  #destroyRef = inject(DestroyRef);
  #partnerConfigService = inject(PartnerConfigService);
  #partnerService = inject(PartnerService);
  #reservationCheckoutPaymentMethodsService = inject(ReservationCheckoutPaymentMethodsService);
  #reservationCheckoutStateService = inject(ReservationCheckoutStateService);
  #route = inject(ActivatedRoute);
  #toastService = inject(ToastService);
  readonly #fzTracking = inject(FzTrackingService);
  #userService = inject(UserService);

  get canMarkAsPaid(): boolean {
    const moneyConfirmationValid = !this.requiresMoneyConfirmation() || this.isMoneyConfirmed;
    return moneyConfirmationValid;
  }
  card: CardElement | null = null;
  @Input() cart: Cart | null = null;
  isMoneyConfirmed = false;
  partner: Partner | null = this.#partnerService.getPartner();
  paymentType: BusinessPaymentTypeEnum | null = null;
  @Output() paymentTypeChange: EventEmitter<BusinessPaymentTypeEnum> = new EventEmitter();
  paymentTypes = signal<BusinessPaymentMethodOption[]>([]);
  receiptDocumentMessage: string | null = null;
  @Input({ required: true }) reservation!: Reservation;
  reservationId: string | null = this.#route.snapshot.params.reservationId;
  @Input() triggerConfirm?: Subject<void>;
  user: User | null = null;

  confirm(): void {
    // Safety check: Don't proceed if money is not confirmed for these payment types
    if (!this.isMoneyConfirmed && this.requiresMoneyConfirmation()) {
      this.#toastService.add({
        message: "Please confirm that the money is already in the organisation's account.",
        type: ToastType.ERROR,
      });
      return;
    }

    this.#fzTracking.track(
      clickPayReservation({
        cartId: this.cart?.id ?? '',
        channelId: this.cart?.channel?.id ?? '',
        checkoutFlowType: this.#reservationCheckoutStateService.state().flowType ?? ReservationCheckoutFlowTypeEnum.BuyNewReservation,
        paymentMethod: PaymentMethod.MARK_AS_PAID,
        paymentOption: resolveClickPayReservationPaymentOption(
          this.cart,
          this.#reservationCheckoutStateService.state().selectedPaymentOption,
        ),
        paymentType: this.paymentType as BusinessPaymentTypeEnum,
        planId: this.reservation.planId,
        reservationFlowType: this.#userService.getReservationFlowType(),
        reservationId: this.reservation.id ?? '',
      }),
    );

    this.#reservationCheckoutPaymentMethodsService.confirm(this.paymentType as BusinessPaymentTypeEnum, this.receiptDocumentMessage);
  }

  ngOnInit(): void {
    this.#getPaymentMethod();
    this.#setupConfirmTrigger();
  }

  #setupConfirmTrigger(): void {
    if (this.triggerConfirm) {
      this.triggerConfirm.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.confirm();
      });
    }
  }

  onCardAdded(card: CardElement | null): void {
    this.card = card;
  }

  onMoneyConfirmationChange(confirmed: boolean): void {
    this.isMoneyConfirmed = confirmed;
  }

  onPaymentMethodSelected(paymentType: BusinessPaymentTypeEnum): void {
    this.paymentType = paymentType;

    // Reset money confirmation when switching payment methods
    // Only keep confirmation if switching between methods that both require it
    const previouslyRequired = this.requiresMoneyConfirmation();
    const nowRequired = this.requiresMoneyConfirmationForType(paymentType);

    if (previouslyRequired !== nowRequired) {
      this.isMoneyConfirmed = false;
    }
  }

  onReceiptDocumentChange(receiptDocumentMessage: string): void {
    this.receiptDocumentMessage = receiptDocumentMessage;
  }

  #buildPaymentTypes(
    methods: BusinessPaymentTypeEnum[],
    useNewReceiptDocumentLabel = false,
    extraOptions: BusinessPaymentMethodOption[] = [],
  ): void {
    const newPaymentTypes = methods.map(method => {
      let translationKey = method === BusinessPaymentTypeEnum.DELEGATED_CARD ? 'card' : method;
      if (method === BusinessPaymentTypeEnum.RECEIPT_DOCUMENT && useNewReceiptDocumentLabel) {
        translationKey = 'new_receipt_document';
      }
      return {
        method,
        disabled: false,
        iconName: this.#setIcon(method),
        label: 'businessManagement.paymentSettings.' + translationKey,
      };
    });
    this.paymentTypes.set([...newPaymentTypes, ...extraOptions]);
    this.paymentType = this.paymentTypes()[0].method;
  }

  #getPaymentMethod() {
    if (this.#userService.isBusiness() && this.user && this.partner) {
      this.#businessPaymentSettingsService
        .getBusinessPaymentSettings({
          userId: this.user.id,
          partnerId: this.partner.id,
        })
        .subscribe({
          next: response => {
            if (response.data) {
              this.#buildPaymentTypes([response.data.paymentType]);
            } else {
              this.#buildPaymentTypes([BusinessPaymentTypeEnum.CARD]);
            }
          },
          error: () => {
            this.#toastService.add({
              message: 'reservation.checkout.paymentSelector.markAsPaid.errorFetchingPaymentMethods',
              type: ToastType.ERROR,
            });
          },
        });
    } else {
      this.#getPaymentSettingsAsPartnerView();
    }
  }

  #getPaymentSettingsAsPartnerView() {
    const defaultPaymentTypes = this.#getPaymentTypes();
    const customOptions: BusinessPaymentMethodOption[] = this.#getReservationCustomMethods().map(m => ({
      method: m.method as BusinessPaymentTypeEnum,
      disabled: false,
      iconName: (m.icon ?? 'credit-card') as IgntIconName,
      label: m.label,
      requiresMoneyConfirmation: true,
      showReceiptDocumentBanner: true,
    }));
    this.#buildPaymentTypes(defaultPaymentTypes, true, customOptions);
  }

  #getReservationCustomMethods(): PartnerCustomPaymentMethod[] {
    const defaultPaymentTypes = this.#getPaymentTypes();
    return (this.#partnerConfigService.config?.payments?.customMethods ?? []).filter(
      m => m.gateway === 'delegated' && m.reservations === true && !defaultPaymentTypes.includes(m.method as BusinessPaymentTypeEnum),
    );
  }

  #getPaymentTypes() {
    return [
      BusinessPaymentTypeEnum.DELEGATED_CARD,
      BusinessPaymentTypeEnum.CASH,
      BusinessPaymentTypeEnum.BANK_TRANSFER,
      BusinessPaymentTypeEnum.RECEIPT_DOCUMENT,
      ...(this.#userService.isFeverUser() ? [BusinessPaymentTypeEnum.FEVER_RECEIPT_DOCUMENT] : []),
    ];
  }

  #setIcon(method: BusinessPaymentTypeEnum): IgntIconName {
    switch (method) {
      case BusinessPaymentTypeEnum.INVOICING:
        return 'file-invoice-dollar';
      case BusinessPaymentTypeEnum.BANK_TRANSFER:
      case BusinessPaymentTypeEnum.RECEIPT_DOCUMENT:
      case BusinessPaymentTypeEnum.FEVER_RECEIPT_DOCUMENT:
        return 'repeat';
      case BusinessPaymentTypeEnum.CASH:
        return 'coins';
      default:
        return 'credit-card';
    }
  }

  private requiresMoneyConfirmation(): boolean {
    return this.requiresMoneyConfirmationForType(this.paymentType as BusinessPaymentTypeEnum);
  }

  private requiresMoneyConfirmationForType(paymentType: BusinessPaymentTypeEnum): boolean {
    const isCustomDelegated = this.#getReservationCustomMethods().some(m => m.method === paymentType);
    return (
      paymentType === BusinessPaymentTypeEnum.BANK_TRANSFER ||
      paymentType === BusinessPaymentTypeEnum.RECEIPT_DOCUMENT ||
      paymentType === BusinessPaymentTypeEnum.FEVER_RECEIPT_DOCUMENT ||
      isCustomDelegated
    );
  }
}
