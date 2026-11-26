export interface SessionSalesSummaryData {
  pack_session_id: number;
  pack_session_label: string;
  sold_tickets: number;
  reserved_unpaid_tickets: number;
}

export class SessionSalesSummary {
  constructor(
    public packSessionId: number,
    public packSessionLabel: string,
    public soldTickets: number,
    public reservedUnpaidTickets: number,
  ) {}
}
