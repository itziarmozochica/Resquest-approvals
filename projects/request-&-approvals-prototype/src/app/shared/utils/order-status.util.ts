import type { OrderUserCancellationRecord } from '@fz-original/app/shared/models/order/order-cancellation-record.model';
import {
  cancelledByCoverGeniusOrderStatus,
  cancelledCoveredByFeverOrderStatus,
} from '@fz-original/app/shared/models/order/order-status.model';
import { refundReasons } from '@fz-original/app/shared/models/order/refund-reason.model';
import type { TagSentiment, TagVariant } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

const cancelledOrderStatuses: ReadonlySet<string> = new Set<string>([
  'cancelled',
  cancelledByCoverGeniusOrderStatus,
  cancelledCoveredByFeverOrderStatus,
]);

const orderStatusSentiments: Readonly<Record<string, TagSentiment>> = {
  active: 'positive',
  cancelled: 'danger',
  [cancelledByCoverGeniusOrderStatus]: 'info',
  [cancelledCoveredByFeverOrderStatus]: 'danger',
  completed: 'positive',
  paid: 'positive',
  pending: 'warning',
  transferred: 'danger',
};

const outlinedOrderStatuses: ReadonlySet<string> = new Set<string>([
  'active',
  'cancelled',
  cancelledByCoverGeniusOrderStatus,
  cancelledCoveredByFeverOrderStatus,
]);

export function getOrderStatusSentiment(status: string | null | undefined, isSuperuser = false): TagSentiment {
  if (showsCoveredByFeverAsInactive(status, isSuperuser)) {
    return 'sharp';
  }
  return orderStatusSentiments[(status ?? '').toLowerCase()] ?? 'info';
}

export function getOrderStatusLabelKey(status: string, isSuperuser: boolean): string {
  return showsCoveredByFeverAsInactive(status, isSuperuser)
    ? 'common.inactive'
    : `validateTicketsNew.validationStatusSummary.${status.toLowerCase()}`;
}

export function getOrderStatusVariant(status: string | null | undefined): TagVariant {
  return outlinedOrderStatuses.has((status ?? '').toLowerCase()) ? 'outline' : 'solid';
}

export function isCancelledOrderStatus(status: string | null | undefined): boolean {
  return cancelledOrderStatuses.has((status ?? '').toLowerCase());
}

export function isCancelledByCoverGeniusOrderStatus(status: string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === cancelledByCoverGeniusOrderStatus;
}

export function isCoveredByFeverOrderStatus(status: string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === cancelledCoveredByFeverOrderStatus;
}

export function showsCoveredByFeverAsInactive(status: string | null | undefined, isSuperuser: boolean): boolean {
  return !isSuperuser && isCoveredByFeverOrderStatus(status);
}

export function isPremiumRefundPolicyRecord(record: OrderUserCancellationRecord): boolean {
  return record.cancellationReason === refundReasons.PREMIUM_REFUND_POLICY || record.refundReason === refundReasons.PREMIUM_REFUND_POLICY;
}
