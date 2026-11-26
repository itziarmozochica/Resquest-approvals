import { PaymentOption } from '@fz-original/app/modules/reservation/models/payment-option.enum';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface DepositPaymentFailedData extends DepositTrackingContext {
  cartId: string;
  errorCode: string | number | null;
  errorStatus: string | null;
  paymentMethod: string | null;
  paymentOption: PaymentOption;
  reservationId: string;
}

export const depositPaymentFailed = defineEvent<DepositPaymentFailedData>('reservation.deposit.paymentFailed');
