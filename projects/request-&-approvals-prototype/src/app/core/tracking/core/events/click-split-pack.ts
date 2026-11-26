import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface ClickSplitPackData {
  plan_id: number;
  ticket_id: number;
}

export class ClickSplitPackEvent extends TrackingEvent<ClickSplitPackData> {
  constructor(readonly data: ClickSplitPackData) {
    super(TrackingEvents.ClickSplitPack, data);
  }
}
