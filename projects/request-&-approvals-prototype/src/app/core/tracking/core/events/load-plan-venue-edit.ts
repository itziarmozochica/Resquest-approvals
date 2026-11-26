import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface LoadPlanVenueData {
  partner_id: number;
  plan_id: number;
  plan_name: string;
}

export class LoadPlanVenueEditEvent extends TrackingEvent<LoadPlanVenueData> {
  constructor(readonly data: LoadPlanVenueData) {
    super(TrackingEvents.LoadPlanVenueEdit, data);
  }
}
