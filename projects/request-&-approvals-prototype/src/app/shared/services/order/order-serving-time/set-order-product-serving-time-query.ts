export interface SetOrderProductServingTimeQuery {
  orderId: number;
  partnerId: number;
  servingAt: string | null;
  sessionId: number;
  userId: number | null;
}
