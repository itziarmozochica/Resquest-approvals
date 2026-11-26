import type { ReservePayment } from '../models/reserve-payload.model';

export interface ReservePaymentBody {
  payment_gateway: string;
  payment_intent_id?: string | null;
  payment_method?: string;
}

export function toPaymentBody(payment: ReservePayment): ReservePaymentBody {
  return {
    payment_gateway: payment.paymentGateway,
    ...(payment.paymentIntentId !== undefined && { payment_intent_id: payment.paymentIntentId }),
    ...(payment.paymentMethod !== undefined && { payment_method: payment.paymentMethod }),
  };
}
