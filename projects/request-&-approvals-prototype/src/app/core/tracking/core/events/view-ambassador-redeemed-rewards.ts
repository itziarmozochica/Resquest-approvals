import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ViewAmbassadorRedeemedRewardsData {
  time: string;
  program_id: string;
  user_id: string;
  partner_id: number;
}

export class ViewAmbassadorRedeemedRewardsEvent extends TrackingEvent<ViewAmbassadorRedeemedRewardsData> {
  constructor(readonly data: ViewAmbassadorRedeemedRewardsData) {
    super(TrackingEvents.ViewAmbassadorRedeemedRewards, data);
  }
}
