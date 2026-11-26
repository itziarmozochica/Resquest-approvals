import { CurrencyPipe, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Input,
  OnChanges,
  OnInit,
  signal,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Balance } from '@fz-original/app/modules/settings/shared/models/balance.model';
import { BusinessPaymentTypeEnum } from '@fz-original/app/modules/settings/shared/models/business-payment-type.enum';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { PaymentMethod } from '../../../models/payment-methods.enum';
import { PaymentOption } from '../../../models/payment-option.enum';
import { ReservationCheckoutFlowTypeEnum } from '../../../models/reservation-checkout-flow-type.enum';
import { ReservationCheckoutPaymentMethodsService } from '../../../services/reservation-checkout-payment-methods.service';
import { ReservationCheckoutStateService } from '../../../services/reservation-checkout-state/reservation-checkout-state.service';
import { clickPayReservation, resolveClickPayReservationPaymentOption } from '../../../tracking/events/click-pay-reservation.event';

@Component({
  selector: 'app-payment-method-balance',
  templateUrl: './payment-method-balance.component.html',
  styleUrls: ['./payment-method-balance.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, NgIf, TranslateModule, IgntInputFieldComponent, FormsModule, ReactiveFormsModule],
})
export class PaymentMethodBalanceComponent implements OnChanges, OnInit {
  #currencyPipe = inject(CurrencyPipe);
  #destroyRef = inject(DestroyRef);
  #partnerService = inject(PartnerService);
  #reservationCheckoutPaymentMethodsService = inject(ReservationCheckoutPaymentMethodsService);
  #reservationCheckoutStateService = inject(ReservationCheckoutStateService);
  readonly #fzTracking = inject(FzTrackingService);
  #userService = inject(UserService);

  get partnerName(): string {
    return this.#partnerService.getPartner()?.name ?? '';
  }
  @Input() balance: Balance | null = null;
  @Input() triggerConfirm?: Subject<void>;
  balanceForm = new FormGroup({
    balanceAmount: new FormControl(''),
  });
  canPayWithBalance = signal(false);
  @Input() cart: Cart | null = null;
  isBalanceDifferentCurrency = (): boolean => {
    const balanceCurrency = this.balance?.currency;
    const cartCurrency = this.cart?.total?.currency;
    if (balanceCurrency == null || cartCurrency == null) {
      return false;
    }
    return balanceCurrency !== cartCurrency;
  };
  isBalanceEnough = (): boolean => (this.balance?.amount ?? 0) >= (this.cart?.total?.amount ?? 0);
  isDepositSelected = computed(() => this.#reservationCheckoutStateService.state().selectedPaymentOption === PaymentOption.DEPOSIT);
  reservation = computed(() => this.#reservationCheckoutStateService.state().reservation);

  confirm(): void {
    this.#fzTracking.track(
      clickPayReservation({
        cartId: this.cart?.id ?? '',
        channelId: this.cart?.channel?.id ?? '',
        checkoutFlowType: this.#reservationCheckoutStateService.state().flowType ?? ReservationCheckoutFlowTypeEnum.BuyNewReservation,
        paymentMethod: PaymentMethod.BALANCE,
        paymentOption: resolveClickPayReservationPaymentOption(
          this.cart,
          this.#reservationCheckoutStateService.state().selectedPaymentOption,
        ),
        paymentType: BusinessPaymentTypeEnum.BALANCE,
        planId: this.#reservationCheckoutPaymentMethodsService.plan()?.id ?? -1,
        reservationFlowType: this.#userService.getReservationFlowType(),
        reservationId: this.#reservationCheckoutPaymentMethodsService.reservation()?.id ?? '',
      }),
    );
    this.#reservationCheckoutPaymentMethodsService.confirm(BusinessPaymentTypeEnum.BALANCE);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['balance']) {
      this.#updateBalanceForm();
    }
  }

  ngOnInit(): void {
    this.#updateBalanceForm();
    this.#setupConfirmTrigger();
  }

  #setupConfirmTrigger(): void {
    if (this.triggerConfirm) {
      this.triggerConfirm.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.confirm();
      });
    }
  }

  #updateBalanceForm(): void {
    const currency = this.balance?.currency ?? this.cart?.total?.currency ?? '';
    this.balanceForm.patchValue({
      balanceAmount: this.#currencyPipe.transform(this.balance?.amount ?? 0, currency, 'symbol-narrow'),
    });
  }
}
