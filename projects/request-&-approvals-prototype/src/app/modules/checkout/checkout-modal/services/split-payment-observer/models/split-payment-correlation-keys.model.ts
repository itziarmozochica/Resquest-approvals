/**
 * Split-payment log correlation keys. Front camelCase; the observer maps them to the fever2
 * snake_case wire keys (`cart_id`, `split_session_id`, …). Only `cartId` (the join key) is required.
 */
export interface SplitPaymentCorrelationKeys {
  cartId: string;
  channel?: string;
  currency?: string;
  deviceId?: string;
  partnerId?: number;
  splitSessionId?: string;
}
