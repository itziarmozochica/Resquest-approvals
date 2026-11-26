import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { TranslateService } from '@ngx-translate/core';

import type { OrderPaymentLeg } from '../../models/order/order-payment-leg.model';
import { resolveOrderPaymentMethodLabel } from './order-payment-method-label.util';

const PAYMENT_LEG_CHANNEL_ID = 'box-office';

export function paymentMethodName(translate: TranslateService, paymentLeg: Pick<OrderPaymentLeg, 'method'>): string {
  return resolveOrderPaymentMethodLabel(translate, paymentLeg.method, PAYMENT_LEG_CHANNEL_ID);
}

export function isCashMethod(paymentLeg: OrderPaymentLeg): boolean {
  return paymentLeg.method === PaymentType.CASH;
}

export function formatMethodLabel(translatedName: string, cardLast4: string | null): string {
  return cardLast4 === null || cardLast4 === '' ? translatedName : `${translatedName} **${cardLast4}`;
}
