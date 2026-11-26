import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface Click360DashboardsData {
  time: string;
}

export class Click360DashboardsEvent extends TrackingEvent<Click360DashboardsData> {
  constructor(readonly data: Click360DashboardsData) {
    super(TrackingEvents.Click360Dashboards, data);
  }
}
