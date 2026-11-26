/**
 * A fever2 session is one ticket type at one datetime, so the ids the agent ticks already carry the
 * ticket-type grain and the selection never needs `session_type_ids`.
 */
export interface PartialRefundSessionCriteria {
  readonly sessionIds: readonly number[];
  readonly orderItemIds?: never;
}

export interface PartialRefundOrderItemCriteria {
  readonly orderItemIds: readonly number[];
  readonly sessionIds?: never;
}

/** fever2 takes order item ids or session ids, never both: the `never` keys reject a value carrying both. */
export type PartialRefundCriteria = PartialRefundOrderItemCriteria | PartialRefundSessionCriteria;

export function isOrderItemCriteria(criteria: PartialRefundCriteria): criteria is PartialRefundOrderItemCriteria {
  return criteria.orderItemIds !== undefined;
}
