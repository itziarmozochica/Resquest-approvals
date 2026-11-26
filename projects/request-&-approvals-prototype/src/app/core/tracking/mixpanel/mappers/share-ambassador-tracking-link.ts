import { ShareAmbassadorTrackingLinkEvent } from '../../core/events/share-ambassador-tracking-link';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ShareAmbassadorTrackingLinkMapper implements MixpanelTrackingMapper<ShareAmbassadorTrackingLinkEvent> {
  map(event: ShareAmbassadorTrackingLinkEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Ambassador|ShareTrackingLink', event.data);
  }
}
