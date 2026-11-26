import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface SavePlanVenueData {
  partner_id: number;
  plan_id: number;
  plan_name: string;
  venue_id: number;
  venue_name: string;
}

export class SavePlanVenueEditEvent extends TrackingEvent<SavePlanVenueData> {
  constructor(readonly data: SavePlanVenueData) {
    super(TrackingEvents.SavePlanVenueEdit, data);
  }
}
