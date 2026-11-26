import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickConfirmDeleteSessionRuleData {
  plan_id: number;
  rule_id: number;
}

export class ClickConfirmDeleteSessionRuleEvent extends TrackingEvent<ClickConfirmDeleteSessionRuleData> {
  constructor(readonly data: ClickConfirmDeleteSessionRuleData) {
    super(TrackingEvents.ClickConfirmDeleteSessionRule, data);
  }
}
