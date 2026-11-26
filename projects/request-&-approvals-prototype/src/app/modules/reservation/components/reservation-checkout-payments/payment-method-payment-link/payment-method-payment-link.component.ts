import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { BusinessPaymentTypeEnum } from '@fz-original/app/modules/settings/shared/models/business-payment-type.enum';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { NavigationService } from '@fz-original/app/shared/services/navigation/navigation.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { PaymentMethod } from '../../../models/payment-methods.enum';
import { ReservationCheckoutFlowTypeEnum } from '../../../models/reservation-checkout-flow-type.enum';
import { Reservation } from '../../../models/reservation.model';
import { PaymentLinkService } from '../../../services/payment-link.service';
import { ReservationCheckoutStateService } from '../../../services/reservation-checkout-state/reservation-checkout-state.service';
import { ReservationNavigateService } from '../../../services/reservation-navigate.service';
import { clickPayReservation, resolveClickPayReservationPaymentOption } from '../../../tracking/events/click-pay-reservation.event';

@Component({
  selector: 'app-payment-method-payment-link',
  templateUrl: './payment-method-payment-link.component.html',
  styleUrls: ['./payment-method-payment-link.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
})
export class PaymentMethodPaymentLinkComponent implements OnInit {
  #destroyRef = inject(DestroyRef);
  #navigationService = inject(NavigationService);
  #partnerService = inject(PartnerService);
  #paymentLinkService = inject(PaymentLinkService);
  #reservationCheckoutStateService = inject(ReservationCheckoutStateService);
  #reservationNavigateService = inject(ReservationNavigateService);
  #router = inject(Router);
  readonly #fzTracking = inject(FzTrackingService);
  #userService = inject(UserService);

  @Input() cart: Cart | null = null;
  isLoadingPaymentLinkModal: WritableSignal<boolean> = signal(false);
  @Output() loadingChange = new EventEmitter<boolean>();
  @Input({ required: true }) reservation!: Reservation;
  @Input() triggerConfirm?: Subject<void>;

  ngOnInit(): void {
    this.#setupConfirmTrigger();
  }

  sendPaymentLink(): void {
    if (
      !this.reservation.cartId ||
      !this.reservation.id ||
      !this.#partnerService.getPartner()?.id ||
      !this.#userService.getUserId() ||
      !this.reservation.ownerEmail
    ) {
      return;
    }

    this.#fzTracking.track(
      clickPayReservation({
        cartId: this.cart?.id ?? '',
        channelId: this.cart?.channel?.id ?? '',
        checkoutFlowType: this.#reservationCheckoutStateService.state().flowType ?? ReservationCheckoutFlowTypeEnum.BuyNewReservation,
        paymentMethod: PaymentMethod.PAYMENT_LINK,
        paymentOption: resolveClickPayReservationPaymentOption(
          this.cart,
          this.#reservationCheckoutStateService.state().selectedPaymentOption,
        ),
        paymentType: BusinessPaymentTypeEnum.NONE,
        planId: this.reservation.planId,
        reservationFlowType: this.#userService.getReservationFlowType(),
        reservationId: this.reservation.id,
      }),
    );

    this.isLoadingPaymentLinkModal.set(true);
    this.loadingChange.emit(true);
    this.#paymentLinkService.openModal({
      cartId: this.reservation.cartId,
      planId: this.reservation.planId,
      placeId: this.reservation.placeId,
      reservationId: this.reservation.id,
      reservationEmail: this.reservation.ownerEmail,
      availableLanguages: this.reservation.planAvailableLanguages,
      defaultLanguage: this.reservation.planDefaultLanguage,
      paymentOption: this.#reservationCheckoutStateService.state().selectedPaymentOption ?? undefined,
      onModalLoaded: () => {
        this.isLoadingPaymentLinkModal.set(false);
        this.loadingChange.emit(false);
      },
      onModalClosed: () => {
        const hasMakeReservationInPreviousUrl = /\/make-reservation(?:\/|\?|$)/.test(this.#navigationService.previousUrl || '');

        if (hasMakeReservationInPreviousUrl || this.#navigationService.previousUrl === undefined) {
          this.#router.navigateByUrl(this.#reservationNavigateService.getReservationListUrl());
        }
      },
    });
  }

  #setupConfirmTrigger(): void {
    if (this.triggerConfirm) {
      this.triggerConfirm.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.sendPaymentLink();
      });
    }
  }
}
