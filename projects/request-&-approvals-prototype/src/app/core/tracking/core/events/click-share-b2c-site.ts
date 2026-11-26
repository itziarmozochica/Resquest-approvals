import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickShareB2CSiteData {
  site_link: string;
  plan_id: number;
}

export class ClickShareB2CSiteEvent extends TrackingEvent<ClickShareB2CSiteData> {
  constructor(readonly data: ClickShareB2CSiteData) {
    super(TrackingEvents.ClickShareB2CSite, data);
  }
}
