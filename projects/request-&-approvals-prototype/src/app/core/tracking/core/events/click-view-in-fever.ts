import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickViewInFeverData {
  plan_id: number;
}

export class ClickViewInFeverEvent extends TrackingEvent<ClickViewInFeverData> {
  constructor(readonly data: ClickViewInFeverData) {
    super(TrackingEvents.ClickViewInFever, data);
  }
}
