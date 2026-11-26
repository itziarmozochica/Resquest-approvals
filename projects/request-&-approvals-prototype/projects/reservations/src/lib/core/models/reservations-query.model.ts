import type { ReservationStatus } from './reservation.model';

export type ReservationsOrderDirection = 'asc' | 'desc';

export interface ReservationsOrder {
  readonly direction: ReservationsOrderDirection;
  readonly field: string;
}

export interface ReservationsQuery {
  readonly channelType?: readonly string[];
  readonly cityId?: number;
  readonly itemsPerPage?: number;
  readonly orderBy?: readonly ReservationsOrder[];
  readonly orderId?: string;
  readonly page?: number;
  readonly partnerId?: number;
  readonly placeId?: number;
  readonly planId?: number;
  readonly reservationLocator?: string;
  readonly searchTerm?: string;
  readonly startsAtFrom?: string;
  readonly startsAtTo?: string;
  readonly status?: readonly ReservationStatus[];
}
