import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface OpenExtendDatesCalendarViewData {
  plan_id: number;
}

export class OpenExtendDatesCalendarViewEvent extends TrackingEvent<OpenExtendDatesCalendarViewData> {
  constructor(readonly data: OpenExtendDatesCalendarViewData) {
    super(TrackingEvents.OpenExtendDatesCalendar, data);
  }
}
