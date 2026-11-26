import { ReservationStatus } from '../../../../modules/reservation/models/reservation-status.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface DownloadReservationsData {
  channel: string | null;
  business_type: string | null;
  plan_id: number | null;
  place_id: number | null;
  event_date_from: string | null;
  event_date_to: string | null;
  city_id: number | null;
  file_type: string;
  timezone: string | null;
  reservation_locator: string | null;
  reservation_status: ReservationStatus[] | null;
  number_of_reservations: number | null;
  search: string | null;
}

export class DownloadReservationsEvent extends TrackingEvent<DownloadReservationsData> {
  constructor(readonly data: DownloadReservationsData) {
    super(TrackingEvents.DownloadReservations, data);
  }
}
