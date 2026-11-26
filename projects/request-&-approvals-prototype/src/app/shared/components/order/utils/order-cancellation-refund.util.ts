import { CancellationCouponSummary } from '@fz-original/app/shared/components/order/components/order-history-panel/cancellation-coupon-summary.model';
import { CompensationCouponSummary } from '@fz-original/app/shared/components/order/components/order-history-panel/compensation-coupon-summary.model';
import { DepositStatusEnum } from '@fz-original/app/shared/models/deposit/deposit-status.enum';
import { Money } from '@fz-original/app/shared/models/money.model';
import {
  OrderCancelledTicketRecord,
  OrderUserCancellationRecord,
} from '@fz-original/app/shared/models/order/order-cancellation-record.model';
import { ReimbursementType } from '@fz-original/app/shared/models/order/reimbursement-type.enum';

export function buildCancellationCouponSummaries(tickets: OrderCancelledTicketRecord[]): CancellationCouponSummary[] {
  const seen = new Set<string>();
  const coupons: CancellationCouponSummary[] = [];

  for (const ticket of tickets) {
    if (ticket.cancellationCouponCode != null && !seen.has(ticket.cancellationCouponCode)) {
      seen.add(ticket.cancellationCouponCode);
      coupons.push({
        amount: ticket.cancellationCouponAmount ?? null,
        code: ticket.cancellationCouponCode,
        isAvailable: ticket.cancellationCouponIsAvailable ?? false,
        ownerEmail: ticket.ticketOwner?.email ?? null,
      });
    }
  }

  return coupons;
}

export function buildCompensationCouponSummaries(tickets: OrderCancelledTicketRecord[]): CompensationCouponSummary[] {
  const seen = new Set<string>();
  const coupons: CompensationCouponSummary[] = [];

  for (const ticket of tickets) {
    if (ticket.compensationCouponCode != null && !seen.has(ticket.compensationCouponCode)) {
      seen.add(ticket.compensationCouponCode);
      coupons.push({
        amount: ticket.compensationCouponAmount ?? null,
        code: ticket.compensationCouponCode,
        isAvailable: ticket.compensationCouponIsAvailable ?? false,
        ownerEmail: ticket.ticketOwner?.email ?? null,
      });
    }
  }

  return coupons;
}

/**
 * Refund value for a cancellation record, aligned with order history refund details:
 * voucher (promotion_code) reimbursements use unique coupon amounts; card refunds use refunded_amount when refunded_at is set.
 */
export function getCancellationRecordRefundAmount(record: OrderUserCancellationRecord): Money | null {
  if (record.reimbursementType === ReimbursementType.Voucher) {
    return sumCouponRefundAmounts(record) ?? record.refundedAmount;
  }

  if (record.refundedAmount != null && record.refundedAt != null) {
    return record.refundedAmount;
  }

  return sumCouponRefundAmounts(record);
}

export function getOrderRefundedAmountFromCancellationRecords(records: OrderUserCancellationRecord[] | null | undefined): Money | null {
  const recordAmounts =
    records?.map(record => getCancellationRecordRefundAmount(record)).filter((amount): amount is Money => amount != null) ?? [];

  return sumMoneyAmounts(recordAmounts);
}

/** Latest `refundedAt` across cancellation records, used to date the aggregated refund row. */
export function getOrderRefundedDateFromCancellationRecords(records: OrderUserCancellationRecord[] | null | undefined): string | null {
  const refundedDates = (records ?? []).map(record => record.refundedAt).filter((date): date is string => date != null);
  if (!refundedDates.length) {
    return null;
  }

  return refundedDates.reduce((latest, date) => (new Date(date).getTime() > new Date(latest).getTime() ? date : latest));
}

/**
 * Whether a cancellation recorded a refund request: to the original payment method, on the POS terminal,
 * or in cash at the desk. A voucher, an exchange or no refund records none.
 */
export function isRefundReimbursementType(reimbursementType: string | null | undefined): boolean {
  switch (reimbursementType) {
    case ReimbursementType.ManualRefund:
    case ReimbursementType.OnsitePosRefund:
    case ReimbursementType.OriginalMethod:
      return true;
    default:
      return false;
  }
}

/**
 * Whether the latest cancellation record carries an accepted refund, chosen as fever2 builds the refund slip: latest by
 * `refundedAt ?? createdAt` (a refund made after the cancellation lands on the same record, keeping its type), first one on a tie.
 */
export function latestCancellationRequestedRefund(records: OrderUserCancellationRecord[] | null | undefined): boolean {
  const latestRecord = (records ?? []).reduce<OrderUserCancellationRecord | null>(
    (latest, record) => (latest == null || getRefundRecordedAt(record) > getRefundRecordedAt(latest) ? record : latest),
    null,
  );
  if (latestRecord == null) {
    return false;
  }

  return isRefundReimbursementType(latestRecord.reimbursementType) || latestRecord.refundedAmount != null;
}

function getRefundRecordedAt(record: OrderUserCancellationRecord): number {
  return new Date(record.refundedAt ?? record.createdAt).getTime();
}

/** Voucher cancellations (promotion_code) reimburse the full order value, including any paid deposit. */
export function isOrderRefundedByVoucher(records: OrderUserCancellationRecord[] | null | undefined): boolean {
  return (records ?? []).some(record => record.reimbursementType === ReimbursementType.Voucher);
}

export function getOrderDepositRefundedAmount(
  records: OrderUserCancellationRecord[] | null | undefined,
  deposit: { calculatedAmount?: Money | null; status?: string; refundedAt?: string | null } | null | undefined,
): Money | null {
  if (isOrderRefundedByVoucher(records)) {
    return null;
  }

  if (!deposit?.calculatedAmount) {
    return null;
  }

  const isDepositRefunded = deposit.status === DepositStatusEnum.REFUNDED || !!deposit.refundedAt;
  if (!isDepositRefunded) {
    return null;
  }

  return deposit.calculatedAmount;
}

export function getDepositRefundRecordIndex(
  records: OrderUserCancellationRecord[] | null | undefined,
  deposit: { refundedAt?: string | null } | null | undefined,
): number {
  const safeRecords = records ?? [];
  if (safeRecords.length === 0) {
    return -1;
  }

  const depositRefundedAt = deposit?.refundedAt ?? null;
  if (depositRefundedAt != null) {
    const matchingIndex = safeRecords.findIndex(record => record.refundedAt === depositRefundedAt);
    if (matchingIndex !== -1) {
      return matchingIndex;
    }
  }

  const moneyRefundIndexes = safeRecords
    .map((record, index) => ({ index, record }))
    .filter(({ record }) => record.refundedAmount != null && record.refundedAt != null)
    .map(({ index }) => index);

  return moneyRefundIndexes.length ? moneyRefundIndexes[moneyRefundIndexes.length - 1] : safeRecords.length - 1;
}

function sumCouponRefundAmounts(record: OrderUserCancellationRecord): Money | null {
  const couponAmounts = [
    ...buildCancellationCouponSummaries(record.cancelledTickets),
    ...buildCompensationCouponSummaries(record.cancelledTickets),
  ]
    .map(coupon => coupon.amount)
    .filter((amount): amount is Money => amount !== null);

  return sumMoneyAmounts(couponAmounts);
}

function sumMoneyAmounts(amounts: Money[]): Money | null {
  if (!amounts.length) {
    return null;
  }

  const currency = amounts[0].currency;
  const hasSameCurrency = amounts.every(amount => amount.currency === currency);
  if (!hasSameCurrency) {
    return null;
  }

  const totalAmount = amounts.reduce((total, amount) => total + amount.amount, 0);
  if (totalAmount === 0) {
    return null;
  }

  return new Money(totalAmount, currency);
}
