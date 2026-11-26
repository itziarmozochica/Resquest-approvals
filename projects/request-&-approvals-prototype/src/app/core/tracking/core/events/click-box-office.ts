import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickBoxOfficeData {
  time: string;
}

export class ClickBoxOfficeEvent extends TrackingEvent<ClickBoxOfficeData> {
  constructor(readonly data: ClickBoxOfficeData) {
    super(TrackingEvents.ClickBoxOffice, data);
  }
}
