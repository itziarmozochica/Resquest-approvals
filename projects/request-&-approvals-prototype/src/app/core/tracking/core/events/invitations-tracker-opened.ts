import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InvitationsTrackerOpenedData {
  plan_id: number;
}

export class InvitationsTrackerOpenedEvent extends TrackingEvent<InvitationsTrackerOpenedData> {
  constructor(readonly data: InvitationsTrackerOpenedData) {
    super(TrackingEvents.InvitationsTrackerOpened, data);
  }
}
