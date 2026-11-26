import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface DeleteOnsiteSetupData {
  onsite_setup_id: string;
  place_id: number;
}

export class DeleteOnsiteSetupEvent extends TrackingEvent<DeleteOnsiteSetupData> {
  constructor(readonly data: DeleteOnsiteSetupData) {
    super(TrackingEvents.DeleteOnsiteSetup, data);
  }
}
