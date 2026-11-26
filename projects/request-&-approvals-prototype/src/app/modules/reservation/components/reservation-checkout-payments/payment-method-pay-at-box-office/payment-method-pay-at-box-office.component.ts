import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BusinessPaymentTypeEnum } from '@fz-original/app/modules/settings/shared/models/business-payment-type.enum';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { PaymentMethod } from '../../../models/payment-methods.enum';
import { ReservationCheckoutFlowTypeEnum } from '../../../models/reservation-checkout-flow-type.enum';
import { Reservation } from '../../../models/reservation.model';
import { ReservationCheckoutStateService } from '../../../services/reservation-checkout-state/reservation-checkout-state.service';
import { ReservationNavigateService } from '../../../services/reservation-navigate.service';
import { clickPayReservation, resolveClickPayReservationPaymentOption } from '../../../tracking/events/click-pay-reservation.event';

@Component({
  selector: 'app-payment-method-pay-at-box-office',
  templateUrl: './payment-method-pay-at-box-office.component.html',
  styleUrls: ['./payment-method-pay-at-box-office.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodPayAtBoxOfficeComponent implements OnInit {
  #destroyRef = inject(DestroyRef);
  #reservationCheckoutStateService = inject(ReservationCheckoutStateService);
  #reservationNavigateService = inject(ReservationNavigateService);
  readonly #fzTracking = inject(FzTrackingService);
  #userService = inject(UserService);
  @Input({ required: true }) cart!: Cart;
  reservation = computed(() => this.#reservationCheckoutStateService.state().reservation);
  @Input() triggerConfirm?: Subject<void>;

  payAtBoxOffice(): void {
    const reservation = this.#reservationCheckoutStateService.state().reservation;
    const cartId = this.cart.id;

    if (!reservation || !cartId) {
      return;
    }

    this.#navigateToCheckout(reservation, cartId);
  }

  #navigateToCheckout(reservation: Reservation, cartId: string): void {
    this.#fzTracking.track(
      clickPayReservation({
        cartId,
        channelId: this.cart.channel?.id ?? '',
        checkoutFlowType: this.#reservationCheckoutStateService.state().flowType ?? ReservationCheckoutFlowTypeEnum.BuyNewReservation,
        paymentMethod: PaymentMethod.BOX_OFFICE,
        paymentOption: resolveClickPayReservationPaymentOption(
          this.cart,
          this.#reservationCheckoutStateService.state().selectedPaymentOption,
        ),
        paymentType: BusinessPaymentTypeEnum.NONE,
        planId: reservation.planId,
        reservationFlowType: this.#userService.getReservationFlowType(),
        reservationId: reservation.id ?? '',
      }),
    );

    this.#reservationNavigateService.navigateToBoxOfficeCheckout({
      cart: this.cart,
      cartId,
      cityId: reservation.cityId,
      placeId: reservation.placeId,
      plan: this.#reservationCheckoutStateService.state().plan,
      planId: reservation.planId,
      reservationId: reservation.id,
    });
  }

  ngOnInit(): void {
    this.#setupConfirmTrigger();
  }

  #setupConfirmTrigger(): void {
    if (this.triggerConfirm) {
      this.triggerConfirm.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.payAtBoxOffice();
      });
    }
  }
}
