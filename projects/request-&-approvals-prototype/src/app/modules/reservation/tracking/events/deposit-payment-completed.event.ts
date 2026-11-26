import { PaymentOption } from '@fz-original/app/modules/reservation/models/payment-option.enum';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface DepositPaymentCompletedData extends DepositTrackingContext {
  cartId: string;
  paymentMethod: string;
  paymentOption: PaymentOption;
  reservationId: string;
}

export const depositPaymentCompleted = defineEvent<DepositPaymentCompletedData>('reservation.deposit.paymentCompleted');
