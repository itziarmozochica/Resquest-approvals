import type { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import type { TimelineItemModel } from '@fz-original/app/shared/components/timeline/models/timeline-item.model';
import type { Money } from '@fz-original/app/shared/models/money.model';

export type CheckoutTransactionStatus = 'cancelled' | 'completed' | 'failed' | 'in_progress';

/**
 * One attempt of a checkout, as recorded by the store. Completed legs and failed attempts are both
 * kept (in the order they happened) so the history timeline can surface them; cancelled attempts are
 * never recorded. `status` is restricted to the outcomes the store records, never `in_progress`.
 */
export interface CheckoutTransactionRecord {
  amount: Money;
  delegated: boolean;
  method: PaymentType;
  status: Extract<CheckoutTransactionStatus, 'completed' | 'failed'>;
  timestamp: string;
  failureReason?: string | null;
  paymentId?: string | null;
  terminalDescription?: string | null;
}

export interface CheckoutTransactionItem {
  amount: Money;
  delegated: boolean;
  index: number;
  methodLabel: string;
  status: CheckoutTransactionStatus;
  errorCondition?: string | null;
  methodLabelSuffixKey?: string | null;
  occurredAt?: string;
  paymentId?: string;
  terminalDescription?: string;
}

export type CheckoutTransactionTimelineItem = TimelineItemModel & { transaction: CheckoutTransactionItem };
