export interface StripeCreateCheckoutBodyData {
  api_version: string;
  channel_id?: string;
  payment_intent_id: string;
  payment_method_type: string;
  reservation_id: string;
  user_id: number;
}

export interface StripeCreateCheckoutBody {
  paymentIntentId: string;
}
