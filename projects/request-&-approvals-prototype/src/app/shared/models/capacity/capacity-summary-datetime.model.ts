import { CapacitySummaryBySession, CapacitySummaryBySessionData } from './capacity-summary-by-session.model';

export interface CapacitySummaryByDatetimeData {
  datetime: string;
  sold_tickets: number;
  capacity: number;
  available_tickets: number;
  occupancy: number;
  reserved_unpaid_tickets: number;
  session_summaries: CapacitySummaryBySessionData[];
}

export class CapacitySummaryByDatetime {
  constructor(
    public datetime: string,
    public soldTickets: number,
    public capacity: number,
    public availableTickets: number,
    public occupancy: number,
    public reservedUnpaidTickets: number,
    public capacitySummaryBySessions: CapacitySummaryBySession[] = [],
  ) {}
}
