/**
 * Raw wire shapes returned by the payments backend endpoints (snake_case), kept separate
 * from the domain model so the rest of the app only depends on the camelCase contract.
 */

export interface TriggerPaymentResponseDto {
  success: boolean;
  charge_id?: string | null;
  error?: string;
  /** Machine-readable reason for a rejected trigger (e.g. `TERMINAL_UNREACHABLE`), sent beside `error`. */
  error_code?: string;
}

export interface TriggerPaymentRequestDto {
  amount?: number;
  cash_leg_amount?: number;
  cash_received?: number;
  device_id?: string;
  gateway?: string;
  method?: string;
  payment_configuration_id?: string;
  split_leg_index?: number;
}

export interface CreateCartPaymentRequestDto extends TriggerPaymentRequestDto {
  channel_id?: string;
  override_capacity?: boolean;
  payment_card_type?: string;
  payment_method_type?: string;
  place_id?: number;
  session_id?: string;
  user_id?: number;
}

export interface CreateCartPaymentResponseDto extends TriggerPaymentResponseDto {
  block_booker?: boolean;
  blocks_purchase_on_failure?: boolean;
  transaction_id?: string | null;
}

export interface CancelPaymentResponseDto {
  success: boolean;
  error?: string;
  status?: string;
  session_status?: string;
}

export interface ConfirmPaymentRequestDto {
  outcome: string;
  authorized_amount?: number;
  currency?: string;
  psp_reference?: string;
  error_condition?: string;
  refusal_reason?: string;
}

export interface ConfirmPaymentResponseDto {
  success: boolean;
  error?: string;
  error_code?: string;
}

export interface PaymentSplitDto {
  amount: number | string;
  /** Declared by the schema but not populated by the poll handler — serializes as `null`. */
  created_at: string | null;
  /** Declared by the schema but not populated by the poll handler — serializes as `null`. */
  device_id: string | null;
  /** Declared by the schema but not populated by the poll handler — serializes as `null`. */
  error_condition: string | null;
  /** Gateway-agnostic failure classification for a failed/canceled leg (the only failure vocabulary exposed to the client). */
  failure_category: string | null;
  gateway: string | null;
  id: string;
  payment_method: string | null;
  /** Declared by the schema but not populated by the poll handler — serializes as `null`. */
  psp_reference: string | null;
  status: string;
  timestamp: string;
}

export interface PaymentsStatusDto {
  amount: number | string;
  created_at: string;
  id: string;
  split_paid_amount: number | string;
  splits: PaymentSplitDto[];
  status: string;
  updated_at: string;
}

export interface CreateTapToPaySessionRequestDto {
  payment_configuration_id: string;
  setup_token: string;
}

export interface TapToPaySessionResponseDto {
  data: { installation_id: string; sdk_data: string } | null;
  error: { code?: string; message?: string } | null;
}
