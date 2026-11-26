import { ReservationDTO } from '../services/models/reservation.dto';

export interface ReservationsSummaryData {
  count?: number | null;
  reservations: ReservationDTO[];
}
