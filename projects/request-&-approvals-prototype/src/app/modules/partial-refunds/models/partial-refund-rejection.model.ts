/**
 * Mirrors fever2's `payment.domain.partial_refund.PartialRefundRejectionCode`, the complete set of
 * reasons the validation chain can give for holding tickets back. Kept to exactly what that enum
 * declares: a code this app names but the engine never sends is copy nobody can reach, and it
 * reads as though the screen handles a case it has in fact never seen.
 *
 * Every code here excludes the tickets it names. Capping is a separate signal (`isCapped` on a
 * preview row) and is not a rejection: a capped row is still refunded, just for less than asked.
 * The two ceiling codes below fire when the amount cannot be capped into range at all.
 *
 * `order_not_refundable` is the only one the engine returns on its own — it short-circuits the
 * chain, so an order carrying it is never tested against the rest.
 */
export const partialRefundRejectionCodes = {
  AMOUNT_EXCEEDS_ITEM_CEILING: 'amount_exceeds_item_ceiling',
  AMOUNT_EXCEEDS_ORDER_CEILING: 'amount_exceeds_order_ceiling',
  DOUBLE_REFUND_NOT_ACKNOWLEDGED: 'double_refund_not_acknowledged',
  GATEWAY_PARTIAL_REFUND_NOT_SUPPORTED: 'gateway_partial_refund_not_supported',
  NO_REFUNDABLE_AMOUNT: 'no_refundable_amount',
  ORDER_NOT_REFUNDABLE: 'order_not_refundable',
  PAYMENT_METHOD_NOT_REFUNDABLE: 'payment_method_not_refundable',
  PAYMENT_METHOD_PARTIAL_REFUND_NOT_SUPPORTED: 'payment_method_partial_refund_not_supported',
  PAYMENT_METHOD_REFUND_PERIOD_EXPIRED: 'payment_method_refund_period_expired',
  SELECTION_NO_LONGER_REFUNDABLE: 'selection_no_longer_refundable',
  UNSUPPORTED_MULTI_LEG_ORDER: 'unsupported_multi_leg_order',
} as const;

export type PartialRefundRejectionCode = (typeof partialRefundRejectionCodes)[keyof typeof partialRefundRejectionCodes];

/**
 * Read when the engine sends a code this build does not know. fever2's enum is expected to grow,
 * and a partner should still get a sentence rather than a raw identifier when it does.
 */
export const partialRefundRejectionFallbackKey = 'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.fallback';

/**
 * One sentence per code, named rather than built by gluing the code onto a key prefix. Interpolating
 * a key cannot be checked by anything: a code with no copy renders the key path itself, on screen,
 * in front of a partner. Spelling the keys out means a missing one is a type error here and a failing
 * test in the spec beside this file.
 */
export const partialRefundRejectionLabelKeys: Record<PartialRefundRejectionCode, string> = {
  [partialRefundRejectionCodes.AMOUNT_EXCEEDS_ITEM_CEILING]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.amount_exceeds_item_ceiling',
  [partialRefundRejectionCodes.AMOUNT_EXCEEDS_ORDER_CEILING]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.amount_exceeds_order_ceiling',
  [partialRefundRejectionCodes.DOUBLE_REFUND_NOT_ACKNOWLEDGED]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.double_refund_not_acknowledged',
  [partialRefundRejectionCodes.GATEWAY_PARTIAL_REFUND_NOT_SUPPORTED]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.gateway_partial_refund_not_supported',
  [partialRefundRejectionCodes.NO_REFUNDABLE_AMOUNT]: 'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.no_refundable_amount',
  [partialRefundRejectionCodes.ORDER_NOT_REFUNDABLE]: 'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.order_not_refundable',
  [partialRefundRejectionCodes.PAYMENT_METHOD_NOT_REFUNDABLE]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.payment_method_not_refundable',
  [partialRefundRejectionCodes.PAYMENT_METHOD_PARTIAL_REFUND_NOT_SUPPORTED]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.payment_method_partial_refund_not_supported',
  [partialRefundRejectionCodes.PAYMENT_METHOD_REFUND_PERIOD_EXPIRED]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.payment_method_refund_period_expired',
  [partialRefundRejectionCodes.SELECTION_NO_LONGER_REFUNDABLE]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.selection_no_longer_refundable',
  [partialRefundRejectionCodes.UNSUPPORTED_MULTI_LEG_ORDER]:
    'orders.bulkPartialRefunds.reviewConfirm.excluded.reasons.unsupported_multi_leg_order',
};

/** The key to translate for a code off the wire, which is a plain string and may be unknown. */
export function partialRefundRejectionLabelKey(code: string): string {
  // Safe for any string: a code this build does not know misses the record and the fallback answers.
  return partialRefundRejectionLabelKeys[code as PartialRefundRejectionCode] ?? partialRefundRejectionFallbackKey;
}

export interface PartialRefundRejectionDTO {
  code: string;
  orders_count: number;
  tickets_count: number;
}

export interface PartialRefundRejection {
  readonly code: string;
  readonly ordersCount: number;
  readonly ticketsCount: number;
}

export interface PartialRefundRejectedOrderDTO {
  order_id: number;
  rejection_codes: string[];
  session_ids: number[];
  session_type_ids: number[];
  tickets_count: number;
}

/**
 * One rejected order, named. The summaries above answer "how many and why" for the screen; this
 * answers "which ones" for the export, so an agent can work through them afterwards. An order can
 * fail more than one check, hence a list of codes rather than one.
 */
export interface PartialRefundRejectedOrder {
  readonly orderId: number;
  readonly rejectionCodes: readonly string[];
  readonly sessionIds: readonly number[];
  readonly sessionTypeIds: readonly number[];
  readonly ticketsCount: number;
}
