import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InvitationsTrackerFiltersAppliedData {
  plan_id: number;
  has_search_term?: boolean;
}

export class InvitationsTrackerFiltersAppliedEvent extends TrackingEvent<InvitationsTrackerFiltersAppliedData> {
  constructor(readonly data: InvitationsTrackerFiltersAppliedData) {
    super(TrackingEvents.InvitationsTrackerFiltersApplied, data);
  }
}
