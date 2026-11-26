import { Money } from '../money.model';

export interface OrderPaymentLeg {
  cardLast4: string | null;
  id: string;
  method: string;
  paidAmount: Money;
  /** Cumulative across every earlier cancellation, not just the last one. */
  refundedAmount: Money | null;
}

export interface OrderPaymentLegsRequest {
  orderId: number;
  partnerId: number;
}
