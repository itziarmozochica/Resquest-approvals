import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutPaymentCompletedData {
  itemCount: number;
  paymentMethod: PaymentType;
  planIds: number[];
  timeslotCount: number;
  totalAmount: number;
}

export const posCheckoutPaymentCompleted = defineEvent<PosCheckoutPaymentCompletedData>('pos.checkout.payment.completed');
