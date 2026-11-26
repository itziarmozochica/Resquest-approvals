import { PaymentOption } from '@fz-original/app/modules/reservation/models/payment-option.enum';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface DepositPaymentOptionSelectedData extends DepositTrackingContext {
  cartId: string;
  paymentOption: PaymentOption;
  reservationId: string;
}

export const depositPaymentOptionSelected = defineEvent<DepositPaymentOptionSelectedData>('reservation.deposit.paymentOptionSelected');
