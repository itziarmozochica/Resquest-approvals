import { ListPlanItem } from '../../../../modules/attendees/list-attendees/models/list-plan-item.model';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadAttendeeListData {
  plan: ListPlanItem;
  time: string;
  starts_at_from: string;
  starts_at_to: string;
  has_results: boolean;
  default_filter: boolean;
}

export class LoadAttendeeListEvent extends TrackingEvent<LoadAttendeeListData> {
  constructor(readonly data: LoadAttendeeListData) {
    super(TrackingEvents.LoadAttendeeList, data);
  }
}
