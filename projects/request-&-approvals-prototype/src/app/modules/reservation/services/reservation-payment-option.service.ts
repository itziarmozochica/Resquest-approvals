import { inject, Injectable } from '@angular/core';

import { isDepositInFinalStateUtil } from '../../../shared/utils/deposit.util';
import { PaymentOption } from '../models/payment-option.enum';
import { ReservationCheckoutStateService } from './reservation-checkout-state/reservation-checkout-state.service';

@Injectable({
  providedIn: 'root',
})
export class ReservationPaymentOptionService {
  #reservationCheckoutStateService = inject(ReservationCheckoutStateService);

  switchToPaymentOption(option: PaymentOption): void {
    const state = this.#reservationCheckoutStateService.state();
    const reservationCart = state.reservationCart;
    const deposit = reservationCart?.deposit;
    const remaining = reservationCart?.total?.amount ?? 0;
    const depositAmount = deposit?.calculatedAmount?.amount;

    if (option === PaymentOption.FULL_PAYMENT || !depositAmount || isDepositInFinalStateUtil(deposit) || remaining <= depositAmount) {
      this.#reservationCheckoutStateService.updateStateProp('selectedPaymentOption', PaymentOption.FULL_PAYMENT);
    } else if (option === PaymentOption.DEPOSIT) {
      this.#reservationCheckoutStateService.updateStateProp('selectedPaymentOption', PaymentOption.DEPOSIT);
    }
  }

  initializePaymentOption(queryParamPaymentOption?: PaymentOption): void {
    const state = this.#reservationCheckoutStateService.state();
    const reservationCart = state.reservationCart;
    const deposit = reservationCart?.deposit;

    if (queryParamPaymentOption === PaymentOption.FULL_PAYMENT || !deposit) {
      this.#reservationCheckoutStateService.updateStateProp('selectedPaymentOption', PaymentOption.FULL_PAYMENT);
      return;
    }

    const remaining = reservationCart?.total?.amount ?? 0;
    const depositAmount = deposit.calculatedAmount?.amount;

    if (
      queryParamPaymentOption === PaymentOption.DEPOSIT &&
      !isDepositInFinalStateUtil(deposit) &&
      !!depositAmount &&
      remaining > depositAmount
    ) {
      this.switchToPaymentOption(PaymentOption.DEPOSIT);
    } else {
      this.#reservationCheckoutStateService.updateStateProp('selectedPaymentOption', PaymentOption.FULL_PAYMENT);
    }
  }
}
