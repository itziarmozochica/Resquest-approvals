import { PaymentMethodSummary, Shift } from '../../../shared/models/shifts.model';

const MINUTE_IN_MILLIS = 60 * 1000;

export function getShiftDurationMinutes(startTime: string, endTime: Date = new Date()): number {
  const intervalInMillis = endTime.getTime() - new Date(startTime).getTime();

  return Math.max(0, Math.floor(intervalInMillis / MINUTE_IN_MILLIS));
}

export function getShiftTransactionCount(paymentMethodSummaries: PaymentMethodSummary[] | undefined): number {
  return (paymentMethodSummaries ?? []).reduce((total, { ticketsSoldCount }) => total + ticketsSoldCount, 0);
}

function isResolvableCashierId(cashierId: number | undefined): cashierId is number {
  return cashierId !== undefined && cashierId !== 0 && !Number.isNaN(cashierId);
}

export function resolveCashierId(userId: number | undefined, openedShift: Shift | null | undefined, shiftId: string): number | undefined {
  if (isResolvableCashierId(userId)) {
    return userId;
  }

  if (!openedShift || openedShift.id !== shiftId) {
    return undefined;
  }

  return isResolvableCashierId(openedShift.b2bUser.b2bUserId) ? openedShift.b2bUser.b2bUserId : undefined;
}
