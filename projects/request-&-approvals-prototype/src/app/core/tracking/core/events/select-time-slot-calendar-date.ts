import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SelectTimeSlotCalendarDateData {
  plan_id: number;
  place_id: number;
  plan_localized_date: string;
}

export class SelectTimeSlotCalendarDateEvent extends TrackingEvent<SelectTimeSlotCalendarDateData> {
  constructor(readonly data: SelectTimeSlotCalendarDateData) {
    super(TrackingEvents.SelectTimeSlotCalendarDate, data);
  }
}
