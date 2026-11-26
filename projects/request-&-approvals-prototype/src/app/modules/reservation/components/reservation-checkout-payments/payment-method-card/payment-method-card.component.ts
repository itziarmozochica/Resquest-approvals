import { NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BusinessPaymentTypeEnum } from '@fz-original/app/modules/settings/shared/models/business-payment-type.enum';
import { CardStripeInputComponent } from '@fz-original/app/shared/components/card-stripe-input/card-stripe-input.component';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { CardElement } from '@feverup/ts-stripe-sdk';

import { PaymentMethod } from '../../../models/payment-methods.enum';
import { ReservationCheckoutFlowTypeEnum } from '../../../models/reservation-checkout-flow-type.enum';
import { ReservationCheckoutPaymentMethodsService } from '../../../services/reservation-checkout-payment-methods.service';
import { ReservationCheckoutStateService } from '../../../services/reservation-checkout-state/reservation-checkout-state.service';
import { clickPayReservation, resolveClickPayReservationPaymentOption } from '../../../tracking/events/click-pay-reservation.event';

@Component({
  selector: 'app-payment-method-card',
  templateUrl: './payment-method-card.component.html',
  styleUrls: ['./payment-method-card.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, CardStripeInputComponent, TranslateModule, NgFor, IgntAlertComponent],
})
export class PaymentMethodCardComponent implements OnInit {
  #destroyRef = inject(DestroyRef);
  #reservationCheckoutPaymentMethodsService = inject(ReservationCheckoutPaymentMethodsService);
  #reservationCheckoutStateService = inject(ReservationCheckoutStateService);
  readonly #fzTracking = inject(FzTrackingService);
  #userService = inject(UserService);

  @Output() cardAdded: EventEmitter<CardElement | null> = new EventEmitter();
  @Input() cart: Cart | null = null;
  errors = signal<string[]>([]);
  reservation = computed(() => this.#reservationCheckoutStateService.state().reservation);
  @Input() triggerConfirm?: Subject<void>;

  payWithCard(): void {
    this.#setErrors();

    if (this.errors().length > 0) {
      return;
    }

    this.#fzTracking.track(
      clickPayReservation({
        cartId: this.cart?.id ?? '',
        channelId: this.cart?.channel?.id ?? '',
        checkoutFlowType: this.#reservationCheckoutStateService.state().flowType ?? ReservationCheckoutFlowTypeEnum.BuyNewReservation,
        paymentMethod: PaymentMethod.CARD,
        paymentOption: resolveClickPayReservationPaymentOption(
          this.cart,
          this.#reservationCheckoutStateService.state().selectedPaymentOption,
        ),
        paymentType: BusinessPaymentTypeEnum.STRIPE,
        planId: this.#reservationCheckoutStateService.state().plan?.id ?? -1,
        reservationFlowType: this.#userService.getReservationFlowType(),
        reservationId: this.#reservationCheckoutStateService.state().reservation?.id ?? '',
      }),
    );
    this.#reservationCheckoutPaymentMethodsService.confirm(BusinessPaymentTypeEnum.STRIPE);
  }

  stripeCardAdded(card: CardElement | null): void {
    this.#reservationCheckoutPaymentMethodsService.saveCard(card);
    this.cardAdded.emit(card);
    this.errors.set([]);
  }

  ngOnInit(): void {
    this.#setupConfirmTrigger();
  }

  #setErrors(): void {
    this.errors.set([]);

    if (this.#reservationCheckoutPaymentMethodsService.card === null) {
      this.errors.update(errors => [...errors, 'reservation.checkout.paymentSelector.card.errors.cardNotAdded']);
    }
  }

  #setupConfirmTrigger(): void {
    if (this.triggerConfirm) {
      this.triggerConfirm.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.payWithCard();
      });
    }
  }
}
