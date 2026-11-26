import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadReportData {
  report_name: string;
  restriction_type: string;
  time: string;
}

export class LoadReportEvent extends TrackingEvent<LoadReportData> {
  constructor(readonly data: LoadReportData) {
    super(TrackingEvents.LoadReport, data);
  }
}
