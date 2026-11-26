import { OpenOnsiteSetupModalEvent } from '../../core/events/open-onsite-setup-modal';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class OpenOnsiteSetupModalMapper implements MixpanelTrackingMapper<OpenOnsiteSetupModalEvent> {
  map(event: OpenOnsiteSetupModalEvent): MixpanelEvent {
    return new MixpanelEvent('open_onsite_setup_modal', event.data);
  }
}
