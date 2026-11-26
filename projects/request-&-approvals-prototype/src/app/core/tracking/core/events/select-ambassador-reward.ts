import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SelectAmbassadorRewardData {
  time: string;
  program_id: string;
  reward_id: string;
  points_required: number;
  user_current_points: number;
  user_id: string;
  partner_id: number;
}

export class SelectAmbassadorRewardEvent extends TrackingEvent<SelectAmbassadorRewardData> {
  constructor(readonly data: SelectAmbassadorRewardData) {
    super(TrackingEvents.SelectAmbassadorReward, data);
  }
}
