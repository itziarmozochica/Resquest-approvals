export interface SplitPaymentTriggerResponse {
  success: boolean;
  error?: string;
}

export interface CartPaymentsStatusSplit {
  amount: number | string;
  created_at: string;
  device_id: string | null;
  error_condition: string | null;
  id: string;
  psp_reference: string | null;
  status: string;
  updated_at: string;
}

export type CartPaymentSessionStatus =
  | 'awaiting_book_release'
  | 'book_release_ko'
  | 'cancelled'
  | 'completed'
  | 'in_progress'
  | 'initiated';

/**
 * Mirrors partners' own state, passed through by fever2. `voided` is a sale that reached the fiscal
 * journal and was taken back off it, and `not_applicable` a cart with no fiscal compliance at all:
 * neither is the cashier's to retry, which is why neither is in the retryable set.
 */
export type CartFiscalSigningState = 'completed' | 'failed' | 'in_flight' | 'not_applicable' | 'not_registered' | 'voided';

export interface CartPaymentsStatusResponse {
  amount: number | string;
  created_at: string;
  id: string;
  split_paid_amount: number | string;
  splits: CartPaymentsStatusSplit[];
  updated_at: string;
  cart_capacity_block_expires_at?: string | null;
  cart_is_confirmed?: boolean | null;
  cart_is_discarded?: boolean | null;
  cart_is_hold_released?: boolean | null;
  fiscal_signing_state?: CartFiscalSigningState | null;
  status?: CartPaymentSessionStatus;
}
