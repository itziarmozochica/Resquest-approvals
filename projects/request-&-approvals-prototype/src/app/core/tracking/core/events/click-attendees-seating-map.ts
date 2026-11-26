import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickOpenAttendeesSeatingMapData {
  time: string;
}

export class ClickAttendeesSeatingMapEvent extends TrackingEvent<ClickOpenAttendeesSeatingMapData> {
  constructor(readonly data: ClickOpenAttendeesSeatingMapData) {
    super(TrackingEvents.ClickAttendeesSeatingMap, data);
  }
}
