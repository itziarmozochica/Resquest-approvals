import { Money } from '../../../../shared/models/money.model';
import { OrderPaymentMethod } from '../../../../shared/models/order/payment-method.enum';
import { PaymentMethodSummary } from '../../shared/models/shifts.model';

export type PaymentMethodSummariesTotals = Omit<PaymentMethodSummary, 'paymentMethod' | 'paymentMethodName'>;

export type ShiftTicketCounts = Pick<PaymentMethodSummariesTotals, 'ticketsCancelledCount' | 'ticketsSoldCount'>;

export interface TillPaymentMethodSummaries {
  otherSources: ReadonlyArray<PaymentMethodSummary>;
  till: ReadonlyArray<PaymentMethodSummary>;
}

const nonTillPaymentMethods: ReadonlySet<OrderPaymentMethod> = new Set([OrderPaymentMethod.COUPON, OrderPaymentMethod.FREE]);

const nonTicketCountPaymentMethods: ReadonlySet<OrderPaymentMethod> = new Set([OrderPaymentMethod.FREE]);

/**
 * Adds up a shift's payment-method rows. Each order lands in exactly one row (a split order in the
 * `split` one), so the ticket counts are shift totals and never count an order twice.
 */
export function sumPaymentMethodSummaries(summaries: ReadonlyArray<PaymentMethodSummary>, currency: string): PaymentMethodSummariesTotals {
  return summaries.reduce<PaymentMethodSummariesTotals>(
    (totals, summary) => ({
      ticketsCancelledCount: totals.ticketsCancelledCount + summary.ticketsCancelledCount,
      ticketsSoldCount: totals.ticketsSoldCount + summary.ticketsSoldCount,
      total: new Money(totals.total.amount + summary.total.amount, currency),
    }),
    { ticketsCancelledCount: 0, ticketsSoldCount: 0, total: new Money(0, currency) },
  );
}

export function splitTillPaymentMethodSummaries(summaries: ReadonlyArray<PaymentMethodSummary>): TillPaymentMethodSummaries {
  return {
    otherSources: summaries.filter(summary => nonTillPaymentMethods.has(summary.paymentMethod)),
    till: summaries.filter(summary => !nonTillPaymentMethods.has(summary.paymentMethod)),
  };
}

export function sumShiftTicketCounts(summaries: ReadonlyArray<PaymentMethodSummary>): ShiftTicketCounts {
  const { ticketsCancelledCount, ticketsSoldCount } = sumPaymentMethodSummaries(
    summaries.filter(summary => !nonTicketCountPaymentMethods.has(summary.paymentMethod)),
    '',
  );
  return { ticketsCancelledCount, ticketsSoldCount };
}
