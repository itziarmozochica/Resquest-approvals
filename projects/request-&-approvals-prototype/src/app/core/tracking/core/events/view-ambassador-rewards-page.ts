import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ViewAmbassadorRewardsPageData {
  time: string;
  program_id: string;
  user_id: string;
  available_points: number;
  partner_id: number;
}

export class ViewAmbassadorRewardsPageEvent extends TrackingEvent<ViewAmbassadorRewardsPageData> {
  constructor(readonly data: ViewAmbassadorRewardsPageData) {
    super(TrackingEvents.ViewAmbassadorRewardsPage, data);
  }
}
