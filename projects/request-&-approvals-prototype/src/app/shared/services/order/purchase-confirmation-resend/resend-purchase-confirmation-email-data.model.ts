export interface ResendPurchaseConfirmationEmailData {
  partnerId: number;
  placeId: number;
  planId: number;
  ticketId: number;
  codeIds?: number[];
  email?: string;
  reservationId?: string;
}
