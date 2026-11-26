import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CreateOnsiteSetupData {
  onsite_setup_id: string;
  place_id: number;
}

export class CreateOnsiteSetupEvent extends TrackingEvent<CreateOnsiteSetupData> {
  constructor(readonly data: CreateOnsiteSetupData) {
    super(TrackingEvents.CreateOnsiteSetup, data);
  }
}
