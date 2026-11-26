import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickEditSessionRuleData {
  plan_id: number;
  rule_id: number;
}

export class ClickEditSessionRuleEvent extends TrackingEvent<ClickEditSessionRuleData> {
  constructor(readonly data: ClickEditSessionRuleData) {
    super(TrackingEvents.ClickEditSessionRule, data);
  }
}
