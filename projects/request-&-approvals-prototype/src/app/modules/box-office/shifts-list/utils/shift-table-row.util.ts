import { Money } from '../../../../shared/models/money.model';
import { OrderPaymentMethod } from '../../../../shared/models/order/payment-method.enum';
import { fixedDecimals } from '../../../../shared/utils/number.util';
import { PaymentMethodSummary, Shift } from '../../shared/models/shifts.model';
import { splitTillPaymentMethodSummaries } from '../../shift/utils/payment-method-summaries-totals';
import { ShiftTableRowContent } from '../models/shift-table-row-content.model';

const namedPaymentMethods: readonly OrderPaymentMethod[] = [
  OrderPaymentMethod.CARD,
  OrderPaymentMethod.CASH,
  OrderPaymentMethod.SQUARE_QR,
  OrderPaymentMethod.IC_CARD,
];

export function toShiftTableRowContent(shift: Shift, showCustomerSatisfaction: boolean): ShiftTableRowContent {
  const paymentSummaries = shift.paymentMethodSummaries;
  const summariesOf = (paymentMethod: OrderPaymentMethod): PaymentMethodSummary[] =>
    paymentSummaries.filter(summary => summary.paymentMethod === paymentMethod);

  const { till: tillPaymentSummaries } = splitTillPaymentMethodSummaries(paymentSummaries);
  const otherPaymentSummaries = tillPaymentSummaries.filter(summary => !namedPaymentMethods.includes(summary.paymentMethod));

  const currency = shift.cashRegisters?.[0]?.currency;
  const cashAmount = getPaymentSummariesTotal(summariesOf(OrderPaymentMethod.CASH), currency);
  const expectedAmount = getExpectedAmount(shift, currency);

  return {
    id: shift.id,
    userName: shift.b2bUser.b2bUserName,
    userEmail: shift.b2bUser.b2bUserEmail,
    shiftStart: shift.createdAt,
    shiftEnd: shift.closedAt,
    onsiteSetupName: shift.onsiteSetupName || '-',
    cashRegisterNames: getCashRegisterNames(shift),
    ticketsSold: shift.paymentMethodSummaries.reduce((total, { ticketsSoldCount }) => total + ticketsSoldCount, 0),
    cardAmount: getPaymentSummariesTotal(summariesOf(OrderPaymentMethod.CARD), currency),
    cashAmount,
    qrCodeAmount: getPaymentSummariesTotal(summariesOf(OrderPaymentMethod.SQUARE_QR), currency),
    icCardAmount: getPaymentSummariesTotal(summariesOf(OrderPaymentMethod.IC_CARD), currency),
    otherAmount: getPaymentSummariesTotal(otherPaymentSummaries, currency),
    totalAmount: getPaymentSummariesTotal(tillPaymentSummaries, currency),
    comment: shift.comment,
    hasCashIncidence: !!(shift.closedAt && cashAmount.amount !== expectedAmount.amount),
    shiftSurveySatisfaction: getShiftSurveySatisfaction(shift, showCustomerSatisfaction),
  };
}

function getPaymentSummariesTotal(summaries: readonly PaymentMethodSummary[], currency: string): Money {
  return summaries.reduce(
    ({ amount }, { total }) => new Money(fixedDecimals(amount + total.amount, 3), total.currency),
    new Money(0, currency),
  );
}

function getExpectedAmount(shift: Shift, currency: string): Money {
  return shift.cashRegisters.reduce(
    ({ amount }, { initialAmount, finalAmount, currency: registerCurrency }) =>
      new Money(fixedDecimals(amount + ((finalAmount ?? 0) - initialAmount), 3), registerCurrency),
    new Money(0, currency),
  );
}

function getCashRegisterNames(shift: Shift): string {
  const names = (shift.cashRegisters ?? [])
    .map(cashRegister => cashRegister.name)
    .filter(name => name && name.trim() !== '')
    .join(', ');

  return names || '-';
}

function getShiftSurveySatisfaction(shift: Shift, showCustomerSatisfaction: boolean): number | null {
  if (!showCustomerSatisfaction || !shift.survey) {
    return null;
  }

  const totalCount = shift.survey.positiveCount + shift.survey.neutralCount + shift.survey.negativeCount;
  return Math.trunc((shift.survey.positiveCount * 100) / totalCount);
}
