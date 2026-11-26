import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickNewSessionRuleData {
  plan_id: number;
}

export class ClickNewSessionRuleEvent extends TrackingEvent<ClickNewSessionRuleData> {
  constructor(readonly data: ClickNewSessionRuleData) {
    super(TrackingEvents.ClickNewSessionRule, data);
  }
}
