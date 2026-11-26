export interface ReservationPaymentUrlQuery {
  planId: number;
  cartId: string;
  reservationId: string;
  partnerId: number;
  placeId: number;
  language?: string;
}
