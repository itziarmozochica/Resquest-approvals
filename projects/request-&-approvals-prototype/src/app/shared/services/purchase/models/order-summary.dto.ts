export interface OrderSummaryBuyerDTO {
  email: string;
  full_name: string;
}

export interface OrderSummaryDTO {
  buyer: OrderSummaryBuyerDTO;
  created_at: string;
  id: number;
  number_of_tickets: number;
  reference: string;
  session_summary: string | null;
  status: string;
  channel_name?: string | null;
  plan_name?: string | null;
  place_timezone?: string | null;
  session_date?: string | null;
}
