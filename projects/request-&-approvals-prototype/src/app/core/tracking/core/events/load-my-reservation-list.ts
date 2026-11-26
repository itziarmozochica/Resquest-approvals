import { TrackingEvents } from '@fz-original/app/core/tracking/core/tracking-events';
import { TrackingEvent } from '@fz-original/app/core/tracking/tracking-event';

export interface LoadMyReservationListData {
  time: string;
  business_types: string | null;
  city_id: string | null;
  search_term: string | null;
  status: string | null;
  date_range: Record<string, string> | null;
  has_results: boolean;
}

export class LoadMyReservationListEvent extends TrackingEvent<LoadMyReservationListData> {
  constructor(readonly data: LoadMyReservationListData) {
    super(TrackingEvents.LoadMyReservationList, data);
  }
}
