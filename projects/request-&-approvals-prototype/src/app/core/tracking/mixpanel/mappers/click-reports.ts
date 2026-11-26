import { ClickReportsEvent } from '../../core/events/click-reports';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickReportsMapper implements MixpanelTrackingMapper<ClickReportsEvent> {
  map(event: ClickReportsEvent): MixpanelEvent {
    return new MixpanelEvent('click_reports', event.data);
  }
}
