import { ViewAmbassadorRedeemedRewardsEvent } from '../../core/events/view-ambassador-redeemed-rewards';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ViewAmbassadorRedeemedRewardsMapper implements MixpanelTrackingMapper<ViewAmbassadorRedeemedRewardsEvent> {
  map(event: ViewAmbassadorRedeemedRewardsEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Ambassador|ViewRedeemedRewards', event.data);
  }
}
