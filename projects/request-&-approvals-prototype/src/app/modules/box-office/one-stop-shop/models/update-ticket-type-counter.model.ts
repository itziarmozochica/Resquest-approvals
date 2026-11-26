export interface UpdateTicketTypeCounter {
  sessionId: number;
  newCounter: number;
  datetime?: string;
  mainPlanId?: number | null;
  venueId?: number | null;
}
