import { CurrencyPipe, NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { BusinessPaymentTypeEnum } from '@fz-original/app/modules/settings/shared/models/business-payment-type.enum';
import { CouponModule } from '@fz-original/app/shared/components/coupon/coupon.module';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { PaymentMethod } from '../../../models/payment-methods.enum';
import { ReservationCheckoutFlowTypeEnum } from '../../../models/reservation-checkout-flow-type.enum';
import { Reservation } from '../../../models/reservation.model';
import { ReservationCheckoutPaymentMethodsService } from '../../../services/reservation-checkout-payment-methods.service';
import { ReservationCheckoutStateService } from '../../../services/reservation-checkout-state/reservation-checkout-state.service';
import { clickPayReservation, resolveClickPayReservationPaymentOption } from '../../../tracking/events/click-pay-reservation.event';

@Component({
  selector: 'app-payment-method-zero-amount',
  templateUrl: './payment-method-zero-amount.component.html',
  styleUrls: ['./payment-method-zero-amount.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntButtonComponent, CouponModule, CurrencyPipe, NgTemplateOutlet, SharedComponentsModule, NgIf],
})
export class PaymentMethodZeroAmountComponent {
  #breakpointStateService = inject(BreakpointStateService);
  #reservationCheckoutPaymentMethodsService = inject(ReservationCheckoutPaymentMethodsService);
  #reservationCheckoutStateService = inject(ReservationCheckoutStateService);
  readonly #fzTracking = inject(FzTrackingService);
  #userService = inject(UserService);

  cart = input.required<Cart>();
  reservation = input<Reservation | null>(null);
  triggerConfirm = input.required<Subject<void>>();
  isPersisting = input(false);
  confirmEvent = output<void>();
  goBackEvent = output<void>();

  isTablet = computed(
    () => this.#breakpointStateService.getStateProp('isTablet')() || this.#breakpointStateService.getStateProp('isMobile')(),
  );
  isBuyNewReservationFlow = computed(
    () => this.#reservationCheckoutStateService.state().flowType === ReservationCheckoutFlowTypeEnum.BuyNewReservation,
  );

  constructor() {
    effect(onCleanup => {
      const sub = this.triggerConfirm().subscribe(() => this.#confirm());
      onCleanup(() => sub.unsubscribe());
    });
  }

  goBack(): void {
    this.goBackEvent.emit();
  }

  onConfirmClick(): void {
    const cart = this.cart();
    this.#fzTracking.track(
      clickPayReservation({
        cartId: cart.id ?? '',
        channelId: cart.channel?.id ?? '',
        checkoutFlowType: this.#reservationCheckoutStateService.state().flowType ?? ReservationCheckoutFlowTypeEnum.BuyNewReservation,
        paymentMethod: PaymentMethod.FREE,
        paymentOption: resolveClickPayReservationPaymentOption(cart, this.#reservationCheckoutStateService.state().selectedPaymentOption),
        paymentType: BusinessPaymentTypeEnum.FREE,
        planId: this.#reservationCheckoutStateService.state().plan!.id!,
        reservationFlowType: this.#userService.getReservationFlowType(),
        reservationId: this.reservation()?.id ?? '',
      }),
    );
    this.confirmEvent.emit();
  }

  #confirm(): void {
    this.#reservationCheckoutPaymentMethodsService.confirm(BusinessPaymentTypeEnum.FREE);
  }
}
