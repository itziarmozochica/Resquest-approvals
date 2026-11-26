import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface UpdateSessionRuleData {
  plan_id: number;
  rule_id: number;
  previous_source_session_id: number;
  current_source_session_id: number;
  previous_target_session_ids: Array<number>;
  current_target_session_ids: Array<number>;
  previous_condition_type: string;
  current_condition_type: string;
  previous_condition_value: number;
  current_condition_value: number;
  previous_action_type: string;
  current_action_type: string;
  previous_action_value: string;
  current_action_value: string;
}

export class UpdateSessionRuleEvent extends TrackingEvent<UpdateSessionRuleData> {
  constructor(readonly data: UpdateSessionRuleData) {
    super(TrackingEvents.UpdateSessionRule, data);
  }
}
