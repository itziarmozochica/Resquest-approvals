import { PaymentMethod } from '@fz-original/app/modules/reservation/models/payment-methods.enum';
import { PaymentOption } from '@fz-original/app/modules/reservation/models/payment-option.enum';
import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';
import { ReservationCheckoutFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation-checkout-flow-type.enum';
import { BusinessPaymentTypeEnum } from '@fz-original/app/modules/settings/shared/models/business-payment-type.enum';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { DepositStatusEnum } from '@fz-original/app/shared/models/deposit/deposit-status.enum';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

export const CLICK_PAY_RESERVATION_SETTLEMENT_PAYMENT_OPTION = 'settlement' as const;

export type ClickPayReservationPaymentOption = PaymentOption | typeof CLICK_PAY_RESERVATION_SETTLEMENT_PAYMENT_OPTION;

export interface ClickPayReservationData {
  cartId: string;
  channelId: string;
  checkoutFlowType: ReservationCheckoutFlowTypeEnum;
  paymentMethod: PaymentMethod;
  paymentOption: ClickPayReservationPaymentOption;
  paymentType: BusinessPaymentTypeEnum;
  planId: number;
  reservationFlowType: ReservationFlowTypeEnum;
  reservationId: string;
}

export function resolveClickPayReservationPaymentOption(
  cart: Cart | null | undefined,
  selectedPaymentOption: PaymentOption | null | undefined,
): ClickPayReservationPaymentOption {
  const deposit = cart?.deposit;
  if (deposit?.hasPaidDeposit || deposit?.status === DepositStatusEnum.PAID) {
    return CLICK_PAY_RESERVATION_SETTLEMENT_PAYMENT_OPTION;
  }
  return selectedPaymentOption ?? PaymentOption.FULL_PAYMENT;
}

export const clickPayReservation = defineEvent<ClickPayReservationData>('click.payReservation');
