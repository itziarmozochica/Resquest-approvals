export interface OrderSummaryBuyer {
  email: string;
  fullName: string;
}

export interface ValidationOrderSummary {
  buyer: OrderSummaryBuyer;
  createdAt: string;
  id: number;
  numberOfTickets: number;
  reference: string;
  sessionSummary: string | null;
  status: string;
  /** Sales channel label; `null` until fever2 sends `channel_name` on summary rows. */
  channelName?: string | null;
  planName?: string | null;
  placeTimezone?: string | null;
  sessionDate?: string | null;
}

export interface ValidationOrderSummariesPage {
  hasMore: boolean;
  items: ValidationOrderSummary[];
  nextCursor: string | null;
  totalCount: number;
}
