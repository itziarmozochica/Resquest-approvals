import { ViewAmbassadorRewardsPageEvent } from '../../core/events/view-ambassador-rewards-page';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ViewAmbassadorRewardsPageMapper implements MixpanelTrackingMapper<ViewAmbassadorRewardsPageEvent> {
  map(event: ViewAmbassadorRewardsPageEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Ambassador|ViewRewardsPage', event.data);
  }
}
