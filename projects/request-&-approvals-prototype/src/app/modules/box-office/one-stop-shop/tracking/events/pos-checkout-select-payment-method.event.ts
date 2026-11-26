import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCheckoutSelectPaymentMethodSource = 'button' | 'lateral_menu';

export interface PosCheckoutSelectPaymentMethodData {
  addonCount: number;
  availablePaymentMethods: PaymentType[];
  itemCount: number;
  paymentMethod: PaymentType;
  planIds: number[];
  shopProductCount: number;
  source: PosCheckoutSelectPaymentMethodSource;
  ticketCount: number;
  timeslotCount: number;
  totalAmount: number;
}

export const posCheckoutSelectPaymentMethod = defineEvent<PosCheckoutSelectPaymentMethodData>('pos.checkout.select.payment.method');
