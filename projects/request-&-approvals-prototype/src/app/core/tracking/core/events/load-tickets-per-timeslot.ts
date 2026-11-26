import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadTicketsPerTimeslotData {
  city_id: number;
  city_name: string;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  time: string;
  default_filter: boolean;
  has_results: boolean;
}

export class LoadTicketsPerTimeslotEvent extends TrackingEvent<LoadTicketsPerTimeslotData> {
  constructor(readonly data: LoadTicketsPerTimeslotData) {
    super(TrackingEvents.LoadTicketsPerTimeslot, data);
  }
}
