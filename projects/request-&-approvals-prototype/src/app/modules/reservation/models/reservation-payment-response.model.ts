export interface ReservationPaymentResponse {
  order: {
    id: number;
  } | null;
  orderIds: number[];
}

export interface ReservationPaymentResponseDTO {
  order: {
    id: number;
  };
  order_ids?: number[];
}
