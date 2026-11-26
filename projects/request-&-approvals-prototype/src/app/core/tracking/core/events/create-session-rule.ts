import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CreateSessionRuleData {
  plan_id: number;
  source_session_id: number;
  target_session_ids: Array<number>;
  condition_type: string;
  condition_value: number;
  action_type: string;
  action_value: string;
}

export class CreateSessionRuleEvent extends TrackingEvent<CreateSessionRuleData> {
  constructor(readonly data: CreateSessionRuleData) {
    super(TrackingEvents.CreateSessionRule, data);
  }
}
