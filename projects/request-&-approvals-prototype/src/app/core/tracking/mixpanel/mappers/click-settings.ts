import { ClickSettingsEvent } from '../../core/events/click-settings';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickSettingsMapper implements MixpanelTrackingMapper<ClickSettingsEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_settings', event.data);
  }
}
