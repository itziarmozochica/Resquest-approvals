import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { Money } from '@fz-original/app/shared/models/money.model';

import type { CheckoutContext } from '../models/checkout.model';
import type {
  CheckoutTransactionItem,
  CheckoutTransactionRecord,
  CheckoutTransactionStatus,
  CheckoutTransactionTimelineItem,
} from '../models/transaction-history.model';
import { resolvePaymentFailureMessageKey } from './checkout-payment-failure.util';
import { findCheckoutMethodDescriptor, findSelectedCheckoutMethodDescriptor } from './checkout-payment.util';
import { fromCents, toCents } from './checkout-split.util';

type CheckoutTranslateFn = (key: string, params?: Record<string, unknown>) => string;

const TIMELINE_CONTENT_TEMPLATE_KEY = 'transaction';

const TITLE_KEY_BY_STATUS: Record<CheckoutTransactionStatus, string> = {
  cancelled: 'checkout.splitProgress.timelineTitleCancelled',
  completed: 'checkout.splitProgress.timelineTitleCompleted',
  failed: 'checkout.splitProgress.timelineTitleFailed',
  in_progress: 'checkout.splitProgress.timelineTitleProcessing',
};

const TAG_SENTIMENT_BY_STATUS: Record<CheckoutTransactionStatus, 'disable' | 'info' | 'positive'> = {
  cancelled: 'disable',
  completed: 'positive',
  failed: 'disable',
  in_progress: 'info',
};

function resolveIcon(status: CheckoutTransactionStatus): IconProp {
  if (status === 'cancelled' || status === 'failed') {
    return ['fal', 'times'];
  }
  if (status === 'completed') {
    return ['fal', 'check'];
  }
  return ['fas', 'spinner'];
}

function toTimelineItem(
  transaction: CheckoutTransactionItem,
  translate: CheckoutTranslateFn,
  locale: string,
): CheckoutTransactionTimelineItem {
  const isCompleted = transaction.status === 'completed';
  const isInProgress = transaction.status === 'in_progress';
  const isFailedOrCancelled = transaction.status === 'cancelled' || transaction.status === 'failed';
  return {
    contentTemplateKey: isInProgress ? undefined : TIMELINE_CONTENT_TEMPLATE_KEY,
    datetime: transaction.occurredAt ?? '',
    description: isFailedOrCancelled ? (transaction.errorCondition ?? '') : '',
    icon: resolveIcon(transaction.status),
    iconAnimation: isInProgress ? 'spin' : 'none',
    iconSentiment: isFailedOrCancelled ? 'failed' : isCompleted ? 'success' : 'default',
    id: transaction.paymentId ?? `transaction-${transaction.index}`,
    initialExpanded: isInProgress,
    tagSentiment: TAG_SENTIMENT_BY_STATUS[transaction.status],
    tagText: isCompleted || isInProgress ? transaction.amount.toString(locale) : '',
    tagVariant: isInProgress ? 'outline' : 'solid',
    title: translate(TITLE_KEY_BY_STATUS[transaction.status], { n: transaction.index }),
    transaction,
  };
}

export function buildCheckoutTransactionTimelineItems(
  transactions: CheckoutTransactionItem[],
  translate: CheckoutTranslateFn,
  locale: string,
): CheckoutTransactionTimelineItem[] {
  return transactions.map(transaction => toTimelineItem(transaction, translate, locale));
}

export function buildCheckoutTransactionRecord({
  amount,
  context,
  failureReason,
  paymentId,
  status,
}: {
  amount: Money;
  context: CheckoutContext;
  status: Extract<CheckoutTransactionStatus, 'completed' | 'failed'>;
  failureReason?: string | null;
  paymentId?: string;
}): CheckoutTransactionRecord | null {
  if (context.selectedMethod === null) {
    return null;
  }
  const descriptor = findSelectedCheckoutMethodDescriptor(context);
  const delegated = descriptor?.delegated ?? false;
  return {
    amount,
    delegated,
    failureReason: failureReason ?? null,
    method: context.selectedMethod,
    paymentId: paymentId ?? null,
    status,
    terminalDescription: delegated ? null : (resolveTerminalDescription(context) ?? null),
    timestamp: new Date().toISOString(),
  };
}

/** Number of recorded attempts that settled successfully — the count meant by "legs completed". */
export function countCompletedCheckoutTransactions(records: CheckoutTransactionRecord[]): number {
  return records.filter(record => record.status === 'completed').length;
}

/**
 * Sub-payment attempts for the history timeline. Split flows record their legs in
 * `context.transactions` (amount + method + outcome per attempt), which is mapped as-is so both
 * completed legs and failed attempts surface with their own status; cancelled attempts are never
 * recorded. Contexts with no records fall back to the presentational placeholder: an even share of
 * the paid total per completed split, the last one absorbing rounding. The full per-transaction feed
 * (payment id, timestamp, terminal, method label and failure sentence) comes from the record.
 */
export function buildPlaceholderCheckoutTransactions(
  context: CheckoutContext,
  translate: CheckoutTranslateFn,
  inFlightAmount?: Money,
): CheckoutTransactionItem[] {
  const settled = buildSettledCheckoutTransactions(context, translate);
  const inFlight = buildInFlightCheckoutTransaction(context, settled.length, inFlightAmount);
  return inFlight === null ? settled : [...settled, inFlight];
}

function buildInFlightCheckoutTransaction(
  context: CheckoutContext,
  settledCount: number,
  amount: Money | undefined,
): CheckoutTransactionItem | null {
  if (!context.legInFlight || amount === undefined || context.selectedMethod === null) {
    return null;
  }
  const descriptor = findSelectedCheckoutMethodDescriptor(context);
  return {
    amount,
    delegated: descriptor?.delegated ?? false,
    index: settledCount + 1,
    methodLabel: descriptor?.label ?? '',
    methodLabelSuffixKey: descriptor?.labelSuffixKey ?? null,
    status: 'in_progress',
  };
}

function buildSettledCheckoutTransactions(context: CheckoutContext, translate: CheckoutTranslateFn): CheckoutTransactionItem[] {
  if (context.transactions.length > 0) {
    return context.transactions.map((record, position) => toRecordedItem(record, position + 1, context, translate));
  }
  const completedCount = context.currentSplitIndex;
  if (completedCount <= 0) {
    return [];
  }
  const currency = context.cartTotal?.currency ?? 'EUR';
  const paidCents = toCents(context.paidAmount?.amount ?? 0);
  const perTransactionCents = Math.round(paidCents / completedCount);
  return Array.from({ length: completedCount }, (_, position) => {
    const isLast = position === completedCount - 1;
    const amountCents = isLast ? paidCents - perTransactionCents * (completedCount - 1) : perTransactionCents;
    return {
      amount: new Money(fromCents(amountCents), currency),
      delegated: false,
      index: position + 1,
      methodLabel: '',
      status: 'completed',
    };
  });
}

function toRecordedItem(
  record: CheckoutTransactionRecord,
  index: number,
  context: CheckoutContext,
  translate: CheckoutTranslateFn,
): CheckoutTransactionItem {
  const descriptor = findCheckoutMethodDescriptor(context, record.method, record.delegated);
  return {
    amount: record.amount,
    delegated: record.delegated,
    errorCondition: record.status === 'failed' ? translate(resolvePaymentFailureMessageKey(record.failureReason ?? null)) : null,
    index,
    methodLabel: descriptor?.label ?? '',
    methodLabelSuffixKey: descriptor?.labelSuffixKey ?? null,
    occurredAt: record.timestamp,
    paymentId: record.paymentId ?? undefined,
    status: record.status,
    terminalDescription: record.terminalDescription ?? undefined,
  };
}

/** Human label of the selected terminal when the configuration provides one, its id otherwise. */
export function resolveTerminalDescription(context: CheckoutContext): string | undefined {
  if (context.selectedTerminalId === null) {
    return undefined;
  }
  const selectedTerminal = context.availableTerminals.find(terminal => terminal.id === context.selectedTerminalId);
  return selectedTerminal?.label ?? context.selectedTerminalId;
}
