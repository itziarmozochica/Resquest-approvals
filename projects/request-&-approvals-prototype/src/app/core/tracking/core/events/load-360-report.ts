import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface Load360ReportData {
  report_name: string;
  plan_ids: Array<number>;
  currency: string;
  time: string;
}

export class Load360ReportEvent extends TrackingEvent<Load360ReportData> {
  constructor(readonly data: Load360ReportData) {
    super(TrackingEvents.Load360Report, data);
  }
}
