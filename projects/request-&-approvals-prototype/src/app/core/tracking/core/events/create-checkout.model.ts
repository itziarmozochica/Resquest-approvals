export interface CreateCheckoutData {
  cart_id: string;
  payment_gateway: string;
  payment_method?: string;
  obo_flow_type?: string;
}
