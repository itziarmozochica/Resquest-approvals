import { OpenOnsiteSettingsEvent } from '../../core/events/open-onsite_settings';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class OpenOnsiteSettingsMapper implements MixpanelTrackingMapper<OpenOnsiteSettingsEvent> {
  map(event: OpenOnsiteSettingsEvent): MixpanelEvent {
    return new MixpanelEvent('open_onsite_settings', event.data);
  }
}
