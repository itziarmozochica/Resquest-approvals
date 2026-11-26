import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface DuplicateOnsiteSetupData {
  onsite_setup_id: string;
  new_onsite_setup_id: string;
  place_id: number;
}

export class DuplicateOnsiteSetupEvent extends TrackingEvent<DuplicateOnsiteSetupData> {
  constructor(readonly data: DuplicateOnsiteSetupData) {
    super(TrackingEvents.DuplicateOnsiteSetup, data);
  }
}
