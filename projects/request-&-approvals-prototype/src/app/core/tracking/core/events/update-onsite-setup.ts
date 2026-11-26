import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface UpdateOnsiteSetupData {
  onsite_setup_id: string;
  place_id: number;
}

export class UpdateOnsiteSetupEvent extends TrackingEvent<UpdateOnsiteSetupData> {
  constructor(readonly data: UpdateOnsiteSetupData) {
    super(TrackingEvents.UpdateOnsiteSetup, data);
  }
}
