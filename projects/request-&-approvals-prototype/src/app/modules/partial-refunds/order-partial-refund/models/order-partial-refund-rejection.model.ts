import { partialRefundRejectionCodes, type PartialRefundRejectionCode } from '../../models/partial-refund-rejection.model';

/** One refused code as the review lists it: the code to track it by and the sentence the operator reads. */
export interface OrderPartialRefundRejectionView {
  readonly code: string;
  readonly reason: string;
}

const fallbackKey = 'orders.partialRefund.review.rejections.fallback';

/** Singular copy for one order. Spelled out per code so a missing key is a type error, not a key path on screen. */
const labelKeys: Record<PartialRefundRejectionCode, string> = {
  [partialRefundRejectionCodes.AMOUNT_EXCEEDS_ITEM_CEILING]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.amount_exceeds_item_ceiling',
  [partialRefundRejectionCodes.AMOUNT_EXCEEDS_ORDER_CEILING]: 'orders.partialRefund.review.rejections.amount_exceeds_order_ceiling',
  [partialRefundRejectionCodes.DOUBLE_REFUND_NOT_ACKNOWLEDGED]: 'orders.partialRefund.review.rejections.double_refund_not_acknowledged',
  [partialRefundRejectionCodes.GATEWAY_PARTIAL_REFUND_NOT_SUPPORTED]:
    'orders.partialRefund.review.rejections.gateway_partial_refund_not_supported',
  [partialRefundRejectionCodes.NO_REFUNDABLE_AMOUNT]: 'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.no_refundable_amount',
  [partialRefundRejectionCodes.ORDER_NOT_REFUNDABLE]: 'orders.partialRefund.review.rejections.order_not_refundable',
  [partialRefundRejectionCodes.PAYMENT_METHOD_NOT_REFUNDABLE]: 'orders.partialRefund.review.rejections.payment_method_not_refundable',
  [partialRefundRejectionCodes.PAYMENT_METHOD_PARTIAL_REFUND_NOT_SUPPORTED]:
    'orders.partialRefund.review.rejections.payment_method_partial_refund_not_supported',
  [partialRefundRejectionCodes.PAYMENT_METHOD_REFUND_PERIOD_EXPIRED]:
    'orders.partialRefund.review.rejections.payment_method_refund_period_expired',
  [partialRefundRejectionCodes.SELECTION_NO_LONGER_REFUNDABLE]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.selection_no_longer_refundable',
  [partialRefundRejectionCodes.UNSUPPORTED_MULTI_LEG_ORDER]: 'orders.partialRefund.review.rejections.unsupported_multi_leg_order',
};

/** The key to translate for a code off the wire, which is a plain string and may be unknown. */
export function orderPartialRefundRejectionLabelKey(code: string): string {
  return labelKeys[code as PartialRefundRejectionCode] ?? fallbackKey;
}
