import { ClickShareB2CSiteEvent } from '../../core/events/click-share-b2c-site';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickShareB2CSiteMapper implements MixpanelTrackingMapper<ClickShareB2CSiteEvent> {
  map(event: ClickShareB2CSiteEvent): MixpanelEvent {
    return new MixpanelEvent('click_share_b2c_site', event.data);
  }
}
