import { ListPlanItem } from '../../../../modules/attendees/list-attendees/models/list-plan-item.model';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface AttendeeSelectedViewData {
  plan: ListPlanItem;
  time: string;
  selectedView: 'calendar' | 'list';
}

export class AttendeeSelectedViewEvent extends TrackingEvent<AttendeeSelectedViewData> {
  constructor(readonly data: AttendeeSelectedViewData) {
    super(TrackingEvents.AttendeeSelectedView, data);
  }
}
