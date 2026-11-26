import { IMoney, Money } from '../money.model';
import { DepositStatusEnum } from './deposit-status.enum';

export type DepositStatus = `${DepositStatusEnum}`;

export interface DepositData {
  calculated_amount?: number | null;
  effective_total?: IMoney | null;
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
  calculatedAmount?: Money;
  /** Full reservation value (cart currency). When absent, UI may derive from `cart.total` + `calculatedAmount`. */
  effectiveTotal?: Money;
  expirationDate?: string;
  /** When true/false from API, overrides status-based paid detection for UI breakdown. */
  hasPaidDeposit?: boolean;
  id?: string;
  isMarkAsPaidPayment?: boolean;
  isRefundable?: boolean;
  paidAt?: string;
  paymentGateway?: string;
  paymentMethod?: string;
  refundedAt?: string;
  status?: DepositStatus;
  termsAndConditionsUrl?: string;
  warningMessage?: string;
}
