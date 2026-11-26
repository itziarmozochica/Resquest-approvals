import { Load360ReportEvent } from '../../core/events/load-360-report';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class Load360ReportMapper implements MixpanelTrackingMapper<Load360ReportEvent> {
  map(event: Load360ReportEvent): MixpanelEvent {
    return new MixpanelEvent('load_360_report', event.data);
  }
}
