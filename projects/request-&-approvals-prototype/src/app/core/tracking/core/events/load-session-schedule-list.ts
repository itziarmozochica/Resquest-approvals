import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface LoadSessionScheduleListData {
  partner_id: number;
  city_id: number;
  plan_id: number;
  place_id: number;
  startDate: string;
  endDate: string;
  timezone: string;
}

export class LoadSessionScheduleList extends TrackingEvent<LoadSessionScheduleListData> {
  constructor(readonly data: LoadSessionScheduleListData) {
    super(TrackingEvents.LoadSessionScheduleList, data);
  }
}
