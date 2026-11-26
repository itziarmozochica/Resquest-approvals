import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SearchShiftsData {
  created_at_from: string | null;
  created_at_to: string | null;
  city_id: number;
  city_name: string;
  place_id: number;
  place_name: string;
  status: string | null;
}

export class SearchShiftsEvent extends TrackingEvent<SearchShiftsData> {
  constructor(readonly data: SearchShiftsData) {
    super(TrackingEvents.SearchShifts, data);
  }
}
