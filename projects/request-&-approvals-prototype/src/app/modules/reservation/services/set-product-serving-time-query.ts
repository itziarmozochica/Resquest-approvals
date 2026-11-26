export interface SetProductServingTimeQuery {
  partnerId: number;
  reservationId: string;
  servingAt: string | null;
  sessionId: number;
  userId: number | null;
}
