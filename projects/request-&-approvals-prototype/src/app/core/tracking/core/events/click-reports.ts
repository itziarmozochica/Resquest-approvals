import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickReportsData {
  time: string;
}
export class ClickReportsEvent extends TrackingEvent<ClickReportsData> {
  constructor(readonly data: ClickReportsData) {
    super(TrackingEvents.ClickReports, data);
  }
}
