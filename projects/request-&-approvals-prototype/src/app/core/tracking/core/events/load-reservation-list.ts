import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadReservationListData {
  time: string;
  business_types: string | null;
  city_id: string | null;
  search_term: string | null;
  status: string | null;
  date_range: Record<string, string> | null;
  has_results: boolean;
}

export class LoadReservationListEvent extends TrackingEvent<LoadReservationListData> {
  constructor(readonly data: LoadReservationListData) {
    super(TrackingEvents.LoadReservationList, data);
  }
}
