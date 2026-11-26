import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface OnsiteSetupSelectedData {
  name: string;
  details: string;
}

export class OnsiteSetupSelectedEvent extends TrackingEvent<OnsiteSetupSelectedData> {
  constructor(readonly data: OnsiteSetupSelectedData) {
    super(TrackingEvents.OnsiteSetupSelected, data);
  }
}
