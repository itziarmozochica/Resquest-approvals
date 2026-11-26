export interface ReservationDetailQuery {
  partnerId: number;
  reservationId: string;
  userId?: number | null;
}
