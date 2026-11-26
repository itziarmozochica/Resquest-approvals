import { ViewAmbassadorRedeemedRewardDetailEvent } from '../../core/events/view-ambassador-redeemed-reward-detail';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ViewAmbassadorRedeemedRewardDetailMapper implements MixpanelTrackingMapper<ViewAmbassadorRedeemedRewardDetailEvent> {
  map(event: ViewAmbassadorRedeemedRewardDetailEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Ambassador|ViewRedeemedRewardDetail', event.data);
  }
}
