import type { Money, MoneyApi } from './money.model';

export type DepositStatus = 'cancelled' | 'expired' | 'paid' | 'pending' | 'refunded' | 'skipped';

export interface DepositApi {
  calculated_amount?: number | null;
  effective_total?: MoneyApi | null;
  expires_at?: string | null;
  has_paid_deposit?: boolean | null;
  id?: string | null;
  is_mark_as_paid_payment?: boolean | null;
  is_refundable?: boolean | null;
  paid_at?: string | null;
  payment_cart_id?: string | null;
  payment_gateway?: string | null;
  payment_method?: string | null;
  refunded_at?: string | null;
  status?: DepositStatus | null;
  terms_and_conditions_url?: string | null;
  warning_message?: string | null;
}

export interface Deposit {
  readonly calculatedAmount?: Money;
  readonly effectiveTotal?: Money;
  readonly expirationDate?: string;
  readonly hasPaidDeposit?: boolean;
  readonly id?: string;
  readonly isMarkAsPaidPayment?: boolean;
  readonly isRefundable?: boolean;
  readonly paidAt?: string;
  readonly paymentGateway?: string;
  readonly paymentMethod?: string;
  readonly refundedAt?: string;
  readonly status?: DepositStatus;
  readonly termsAndConditionsUrl?: string;
  readonly warningMessage?: string;
}
