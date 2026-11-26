import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { resolvePaymentFailureMessageKey } from '@fz-original/app/modules/checkout/checkout-modal/utils/checkout-payment-failure.util';
import { isPaymentFailureCategory } from '@fz-original/app/payments/models/payments.model';
import { TranslateService } from '@ngx-translate/core';

import type { TimelineIconAnimation, TimelineIconSentiment, TimelineItemModel } from '../../components/timeline/models/timeline-item.model';
import type { OrderTransaction, OrderTransactionStatus } from '../../models/order/order-transaction.model';
import { MoneyPipe } from '../../pipes/money.pipe';
import { formatPaymentTime } from './order-payment-leg-rows.util';
import { paymentMethodName } from './order-payment-method-name.util';

export interface OrderTransactionTimelineDetails {
  failureReasonKey: string | null;
  terminalId: string | null;
}

export type OrderTransactionTimelineItem = TimelineItemModel & { details: OrderTransactionTimelineDetails };

const ORDER_TRANSACTION_CONTENT_TEMPLATE_KEY = 'order-transaction';

const TITLE_KEY_BY_STATUS: Record<OrderTransactionStatus, string> = {
  cancelled: 'validateTicketsNew.orderDetail.transactionHistory.cancelled',
  completed: 'validateTicketsNew.orderDetail.transactionHistory.completed',
  failed: 'validateTicketsNew.orderDetail.transactionHistory.failed',
  in_progress: 'validateTicketsNew.orderDetail.transactionHistory.inProgress',
};

const ICON_BY_STATUS: Record<OrderTransactionStatus, IconProp> = {
  cancelled: ['fal', 'times'],
  completed: ['fal', 'check'],
  failed: ['fal', 'times'],
  in_progress: ['fas', 'spinner'],
};

const ICON_ANIMATION_BY_STATUS: Record<OrderTransactionStatus, TimelineIconAnimation> = {
  cancelled: 'none',
  completed: 'none',
  failed: 'none',
  in_progress: 'spin',
};

const ICON_SENTIMENT_BY_STATUS: Record<OrderTransactionStatus, TimelineIconSentiment> = {
  cancelled: 'failed',
  completed: 'success',
  failed: 'failed',
  in_progress: 'default',
};

const UNKNOWN_FAILURE_CATEGORY = 'UNKNOWN';
const moneyPipe = new MoneyPipe();

export function orderTransactionTimelineItems(
  translate: TranslateService,
  transactions: readonly OrderTransaction[],
  locale: string,
  timezone: string | null = null,
): OrderTransactionTimelineItem[] {
  return [...transactions]
    .sort((first, second) => second.position - first.position)
    .map(transaction => toTimelineItem(translate, transaction, locale, timezone));
}

function toTimelineItem(
  translate: TranslateService,
  transaction: OrderTransaction,
  locale: string,
  timezone: string | null,
): OrderTransactionTimelineItem {
  const details: OrderTransactionTimelineDetails = {
    failureReasonKey: failureReasonKey(transaction),
    terminalId: transaction.terminalId || null,
  };
  const hasDetails = Object.values(details).some(value => value !== null);
  return {
    contentTemplateKey: hasDetails ? ORDER_TRANSACTION_CONTENT_TEMPLATE_KEY : undefined,
    datetime: '',
    description: [
      paymentMethodName(translate, transaction),
      moneyPipe.transform(transaction.amount, locale),
      formatPaymentTime(transaction.createdAt, locale, timezone),
    ]
      .filter(Boolean)
      .join(' | '),
    details,
    icon: ICON_BY_STATUS[transaction.status],
    iconAnimation: ICON_ANIMATION_BY_STATUS[transaction.status],
    iconSentiment: ICON_SENTIMENT_BY_STATUS[transaction.status],
    id: transaction.id,
    initialExpanded: false,
    title: translate.instant(TITLE_KEY_BY_STATUS[transaction.status], { n: transaction.position }),
  };
}

function failureReasonKey({ failureCategory }: OrderTransaction): string | null {
  return failureCategory !== null && failureCategory !== UNKNOWN_FAILURE_CATEGORY && isPaymentFailureCategory(failureCategory)
    ? resolvePaymentFailureMessageKey(failureCategory)
    : null;
}
