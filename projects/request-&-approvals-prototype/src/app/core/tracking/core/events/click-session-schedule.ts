import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface ClickSessionScheduleData {
  partner_id: number;
  plan_id: number;
  place_id: number;
  timeSlot: string;
  newScheduleStartDate: string | null;
  newScheduleEndDate: string | null;
  newScheduleExpirationDate: string | null;
  newScheduleSalesStartDate: string | null;
  previousScheduleStartDate: string | null;
  previousScheduleEndDate: string | null;
  previousScheduleExpirationDate: string | null;
  previousScheduleSalesStartDate: string | null;
}

export class ClickSessionScheduleEvent extends TrackingEvent<ClickSessionScheduleData> {
  constructor(readonly data: ClickSessionScheduleData) {
    super(TrackingEvents.ClickSessionSchedule, data);
  }
}
