/**
 * Typed contract for the payments backend endpoints
 * (`/carts/{cartId}/payments` and `/carts/{cartId}/payments/{parentTransactionId}`).
 *
 * A single payment is modelled as a "split of 1": the same endpoints drive both single and
 * multi-split checkouts, which is why this contract lives in a dedicated, independent payments
 * domain that any feature (checkout, box-office, ...) can depend on.
 */

/**
 * Status of a single split charge (a "leg"). Modelled as a closed union so call sites compare by
 * equality instead of substring matching. Note the single-L `canceled` spelling: it mirrors the
 * backend charge enum (aligned with the Adyen transaction enum), distinct from the double-L
 * `cancelled` used by the session status.
 */
export type SplitChargeStatus = 'in_progress' | 'success' | 'failed' | 'canceled' | 'refunded';

export const SPLIT_CHARGE_STATUSES: readonly SplitChargeStatus[] = ['in_progress', 'success', 'failed', 'canceled', 'refunded'];

export function isSplitChargeStatus(value: string): value is SplitChargeStatus {
  return (SPLIT_CHARGE_STATUSES as readonly string[]).includes(value);
}

/**
 * Status of the whole split session. Modelled as a closed union. Note the double-L `cancelled`
 * spelling (distinct from the charge's single-L `canceled`).
 */
export type SplitSessionStatus = 'initiated' | 'in_progress' | 'completed' | 'cancelled' | 'awaiting_book_release' | 'book_release_ko';

export const SPLIT_SESSION_STATUSES: readonly SplitSessionStatus[] = [
  'initiated',
  'in_progress',
  'completed',
  'cancelled',
  'awaiting_book_release',
  'book_release_ko',
];

export function isSplitSessionStatus(value: string): value is SplitSessionStatus {
  return (SPLIT_SESSION_STATUSES as readonly string[]).includes(value);
}

/**
 * Gateway-agnostic failure classification exposed per failed/canceled leg (the `failure_category`
 * field of a split). It is the only failure vocabulary exposed to the client; the raw gateway
 * reason stays backend-only. Modelled as a closed union so call sites compare by equality.
 */
export type PaymentFailureCategory =
  | 'WRONG_PIN'
  | 'INSUFFICIENT_FUNDS'
  | 'CARD_EXPIRED'
  | 'CARD_BLOCKED'
  | 'CARD_DECLINED'
  | 'UNSUPPORTED_CARD'
  | 'TERMINAL_UNAVAILABLE'
  | 'TERMINAL_BUSY'
  | 'USER_CANCELLED'
  | 'TIMEOUT'
  | 'GATEWAY_ERROR'
  | 'UNKNOWN';

export const PAYMENT_FAILURE_CATEGORIES: readonly PaymentFailureCategory[] = [
  'WRONG_PIN',
  'INSUFFICIENT_FUNDS',
  'CARD_EXPIRED',
  'CARD_BLOCKED',
  'CARD_DECLINED',
  'UNSUPPORTED_CARD',
  'TERMINAL_UNAVAILABLE',
  'TERMINAL_BUSY',
  'USER_CANCELLED',
  'TIMEOUT',
  'GATEWAY_ERROR',
  'UNKNOWN',
];

export function isPaymentFailureCategory(value: string): value is PaymentFailureCategory {
  return (PAYMENT_FAILURE_CATEGORIES as readonly string[]).includes(value);
}

export const CHARGE_IN_PROGRESS_ERROR_CODE = 'CHARGE_IN_PROGRESS';

export const SESSION_HAS_PAYMENTS_ERROR_CODE = 'SESSION_HAS_PAYMENTS';

export const PURCHASE_ALREADY_CONFIRMED_ERROR_CODE = 826;

export interface TriggerPaymentParams {
  cartId: string;
  partnerId: number;
  amount?: number;
  gateway?: string;
  /** Payment method the split is triggered with (e.g. `card`, `cash`). */
  method?: string;
  /** Terminal device id, forwarded only for gateways that settle on a physical device (adyen). */
  deviceId?: string;
  paymentConfigurationId?: string;
  /** Actual cash tendered by the customer for this split leg (EFSTA France). */
  cashReceived?: number;
  /** Cash amount owed for this split leg (EFSTA France). */
  cashLegAmount?: number;
  /** Zero-based index of the cash split leg for fiscal accumulation. */
  splitLegIndex?: number;
}

export interface CartPaymentCheckout {
  userId: number;
  channelId?: string;
  overrideCapacity?: boolean;
  paymentCardType?: string;
  paymentMethodType?: string;
  placeId?: number;
}

export interface CreateCartPaymentParams extends TriggerPaymentParams {
  checkout?: CartPaymentCheckout;
  sessionId?: string;
}

export interface CartPaymentSession {
  transactionId: string;
  blockBooker?: boolean;
  blocksPurchaseOnFailure?: boolean;
}

export interface CreateTapToPaySessionParams {
  partnerId: number;
  paymentConfigurationId: string;
  setupToken: string;
}

export interface GetPaymentsStatusParams {
  cartId: string;
  parentTransactionId: string;
  partnerId: number;
}

export interface CancelPaymentParams {
  cartId: string;
  childTransactionId: string;
  partnerId: number;
  skipRetry?: boolean;
}

export type PaymentConfirmOutcome = 'approved' | 'declined' | 'cancelled' | 'unknown';

export interface ConfirmPaymentParams {
  cartId: string;
  chargeId: string;
  outcome: PaymentConfirmOutcome;
  partnerId: number;
  authorizedAmount?: number;
  currency?: string;
  pspReference?: string;
  errorCondition?: string;
  refusalReason?: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
}

export interface TriggerPaymentResponse {
  success: boolean;
  chargeId?: string;
  error?: string;
  /** Classification of a rejected trigger, when the backend `error_code` maps to a known category. */
  failureCategory?: PaymentFailureCategory;
}

export interface CreateCartPaymentResponse extends TriggerPaymentResponse {
  session?: CartPaymentSession;
}

export interface CancelPaymentResponse {
  success: boolean;
  error?: string;
  status?: SplitChargeStatus;
  sessionStatus?: SplitSessionStatus;
}

export interface PaymentSplit {
  amount: number;
  /** Not populated by the poll handler — always `null`; use {@link timestamp} for ordering. */
  createdAt: string | null;
  deviceId: string | null;
  /** Gateway-agnostic failure classification for a failed/canceled leg. */
  failureCategory: PaymentFailureCategory | null;
  gateway: string | null;
  id: string;
  paymentMethod: string | null;
  pspReference: string | null;
  status: SplitChargeStatus;
  timestamp: string;
}

export interface PaymentsStatus {
  amount: number;
  createdAt: string;
  id: string;
  splitPaidAmount: number;
  splits: PaymentSplit[];
  status: SplitSessionStatus;
  updatedAt: string;
}
