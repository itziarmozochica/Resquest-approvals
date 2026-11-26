import { ClickResellerReportsEvent } from '@fz-original/app/core/tracking/core/events/click-reseller-reports';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickResellerReportsMapper implements MixpanelTrackingMapper<ClickResellerReportsEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_resellers_reports', event.data);
  }
}
