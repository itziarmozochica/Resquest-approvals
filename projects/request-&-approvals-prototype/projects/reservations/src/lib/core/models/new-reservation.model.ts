export interface NewReservationOrderApi {
  id: number;
}

export interface NewReservationApi {
  id: string;
  locator: string;
  expires_at?: string | null;
  order?: NewReservationOrderApi | null;
  order_ids?: number[] | null;
}

export interface NewReservationOrder {
  readonly id: number;
}

export interface NewReservation {
  readonly expiresAt: string | null;
  readonly id: string;
  readonly locator: string;
  /** Only a paid reserve produces an order; a pay-later one answers `null` here. */
  readonly order: NewReservationOrder | null;
  readonly orderIds: readonly number[];
}
