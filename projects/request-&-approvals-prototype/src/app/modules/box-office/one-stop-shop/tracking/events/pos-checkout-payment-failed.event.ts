import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutPaymentFailedData {
  failureReason: string;
  paymentMethod: PaymentType;
  planIds: number[];
}

export const posCheckoutPaymentFailed = defineEvent<PosCheckoutPaymentFailedData>('pos.checkout.payment.failed');
