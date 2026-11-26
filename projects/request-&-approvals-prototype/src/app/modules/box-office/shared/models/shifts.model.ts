import { Money } from '../../../../shared/models/money.model';
import { OrderPaymentMethod } from '../../../../shared/models/order/payment-method.enum';

export enum ShiftStatus {
  opened = 'opened',
  closed = 'closed',
}

export interface CashRegisterDTO {
  cash_register_id: string;
  status: ShiftStatus;
  currency: string;
  initial_amount: number;
  final_amount?: number;
  created_at: string;
  closed_at?: string;
  name?: string;
}

export interface PaymentMethodSummaryDTO {
  payment_method: OrderPaymentMethod;
  payment_method_name?: string | null;
  tickets_sold_count: number;
  tickets_cancelled_count: number;
  total: {
    amount: number;
    currency: string;
  };
}

export interface ShiftUserDTO {
  b2b_user_id: number;
  b2b_user_name: string;
  b2b_user_email: string;
  b2b_user_username: string;
}

export interface ShiftSurveyDTO {
  positive_count: number;
  neutral_count: number;
  negative_count: number;
}

export interface ShiftDTO {
  id: string;
  obo_venue_id: number;
  obo_venue_name: string;
  city_id: number;
  b2b_user: ShiftUserDTO;
  status: ShiftStatus;
  comment?: string;
  created_at: string;
  closed_at?: string;
  cash_registers: CashRegisterDTO[];
  compliance_checkout_enabled?: boolean;
  payment_method_summaries: PaymentMethodSummaryDTO[];
  onsite_setup_id?: string;
  onsite_setup_name?: string;
  surveys?: ShiftSurveyDTO;
}

export interface CashRegister {
  cashRegisterId: string;
  status: ShiftStatus;
  currency: string;
  initialAmount: number;
  finalAmount?: number;
  createdAt: Date;
  closedAt?: Date;
  name?: string;
}

export interface PaymentMethodSummary {
  paymentMethod: OrderPaymentMethod;
  paymentMethodName: string | null;
  ticketsSoldCount: number;
  ticketsCancelledCount: number;
  total: Money;
}

export interface ShiftUser {
  b2bUserId: number;
  b2bUserName: string;
  b2bUserEmail: string;
  b2bUserUsername: string;
}

export interface ShiftSurvey {
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
}

export interface Shift {
  id: string;
  oboVenueId: number;
  oboVenueName: string;
  cityId: number;
  b2bUser: ShiftUser;
  status: ShiftStatus;
  comment?: string;
  createdAt: Date;
  closedAt?: Date;
  cashRegisters: Array<CashRegister>;
  complianceCheckoutEnabled?: boolean;
  paymentMethodSummaries: Array<PaymentMethodSummary>;
  onsiteSetupId?: string;
  onsiteSetupName?: string;
  survey?: ShiftSurvey;
}
