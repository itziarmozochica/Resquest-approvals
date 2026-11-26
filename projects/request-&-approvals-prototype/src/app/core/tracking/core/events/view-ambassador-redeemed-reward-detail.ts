import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ViewAmbassadorRedeemedRewardDetailData {
  time: string;
  program_id: string;
  reward_id: string;
  redemption_id: string;
  user_id: string;
  partner_id: number;
}

export class ViewAmbassadorRedeemedRewardDetailEvent extends TrackingEvent<ViewAmbassadorRedeemedRewardDetailData> {
  constructor(readonly data: ViewAmbassadorRedeemedRewardDetailData) {
    super(TrackingEvents.ViewAmbassadorRedeemedRewardDetail, data);
  }
}
