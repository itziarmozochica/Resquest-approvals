import { LoadReportEvent } from '../../core/events/load-report';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadReportMapper implements MixpanelTrackingMapper<LoadReportEvent> {
  map(event: LoadReportEvent): MixpanelEvent {
    return new MixpanelEvent('load_report', event.data);
  }
}
