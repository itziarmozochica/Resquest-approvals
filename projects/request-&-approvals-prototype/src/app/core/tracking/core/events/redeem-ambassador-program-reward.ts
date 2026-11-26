import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface RedeemAmbassadorProgramRewardData {
  time: string;
  program_id: string;
  reward_id: string;
  user_id: string;
  points_spent: number;
  reward_type: string;
  partner_id: number;
  affiliate_code: string;
  success: boolean;
  error_code?: string;
}

export class RedeemAmbassadorProgramRewardEvent extends TrackingEvent<RedeemAmbassadorProgramRewardData> {
  constructor(readonly data: RedeemAmbassadorProgramRewardData) {
    super(TrackingEvents.RedeemAmbassadorProgramReward, data);
  }
}
