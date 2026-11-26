import { ClickUnvalidateCtaEvent } from '../../core/events/click-unvalidate-cta';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickUnvalidateCtaMapper implements MixpanelTrackingMapper<ClickUnvalidateCtaEvent> {
  map(event: ClickUnvalidateCtaEvent): MixpanelEvent {
    return new MixpanelEvent('click_unvalidate_cta', event.data);
  }
}
