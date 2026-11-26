import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickConfirmExtendDatesCalendarData {
  plan_id: number;
  error: boolean;
}

export class ClickConfirmExtendDatesCalendarEvent extends TrackingEvent<ClickConfirmExtendDatesCalendarData> {
  constructor(readonly data: ClickConfirmExtendDatesCalendarData) {
    super(TrackingEvents.ClickConfirmExtendDatesCalendar, data);
  }
}
