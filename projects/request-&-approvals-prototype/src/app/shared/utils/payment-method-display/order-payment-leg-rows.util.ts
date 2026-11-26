import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';

import { Money } from '../../models/money.model';
import type { OrderPaymentLeg } from '../../models/order/order-payment-leg.model';
import type { OrderTransaction } from '../../models/order/order-transaction.model';
import { MoneyPipe } from '../../pipes/money.pipe';
import { isCashMethod, paymentMethodName } from './order-payment-method-name.util';

export interface OrderPaymentLegRow {
  amount: string;
  cardLast4: string | null;
  icon: 'coins' | 'credit-card';
  id: string;
  name: string;
  refundedAmount: string | null;
  terminalId: string | null;
  time: string | null;
}

const MIN_PAYMENT_LEGS_FOR_BREAKDOWN = 2;
const PAYMENT_TIME_FORMAT = 'LT';
const moneyPipe = new MoneyPipe();

export function hasPaymentLegsBreakdown(legs: readonly OrderPaymentLeg[]): boolean {
  return legs.length >= MIN_PAYMENT_LEGS_FOR_BREAKDOWN;
}

export function orderPaymentLegRows(
  translate: TranslateService,
  legs: readonly OrderPaymentLeg[],
  locale: string,
  transactions: readonly OrderTransaction[] = [],
  timezone: string | null = null,
): OrderPaymentLegRow[] {
  const transactionsById = new Map(transactions.map(transaction => [transaction.id, transaction]));
  return legs.map(leg => {
    const transaction = transactionsById.get(leg.id);
    return {
      amount: moneyPipe.transform(leg.paidAmount, locale),
      cardLast4: leg.cardLast4 || null,
      icon: isCashMethod(leg) ? 'coins' : 'credit-card',
      id: leg.id,
      name: paymentMethodName(translate, leg),
      refundedAmount: leg.refundedAmount !== null && leg.refundedAmount.amount > 0 ? moneyPipe.transform(leg.refundedAmount, locale) : null,
      terminalId: transaction?.terminalId || null,
      time: transaction ? formatPaymentTime(transaction.createdAt, locale, timezone) : null,
    };
  });
}

export function formatPaymentTime(datetime: string, locale: string, timezone: string | null): string | null {
  const parsed = moment(datetime);
  if (!parsed.isValid()) {
    return null;
  }
  const zoned = timezone && moment.tz.zone(timezone) ? parsed.tz(timezone) : parsed;
  return zoned.locale(locale).format(PAYMENT_TIME_FORMAT);
}

export function orderPaymentLegsTotal(legs: readonly OrderPaymentLeg[], locale: string): string {
  const [first, ...rest] = legs;
  if (!first) {
    return moneyPipe.transform(null, locale);
  }
  const amount = rest.reduce((sum, leg) => sum + leg.paidAmount.amount, first.paidAmount.amount);
  return moneyPipe.transform(new Money(amount, first.paidAmount.currency), locale);
}
