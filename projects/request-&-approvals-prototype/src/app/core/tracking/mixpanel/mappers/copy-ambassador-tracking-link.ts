import { CopyAmbassadorTrackingLinkEvent } from '../../core/events/copy-ambassador-tracking-link';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CopyAmbassadorTrackingLinkMapper implements MixpanelTrackingMapper<CopyAmbassadorTrackingLinkEvent> {
  map(event: CopyAmbassadorTrackingLinkEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Ambassador|CopyTrackingLink', event.data);
  }
}
